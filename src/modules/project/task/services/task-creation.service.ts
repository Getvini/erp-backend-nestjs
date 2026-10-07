import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { Jobs } from "@modules/crm/service/entities/job.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { OpportunityServiceJobs } from "@modules/crm/opportunity/entities/opportunity-service-job.entity";
import {
  TaskStatus,
  PerformerType,
  PricingStatus,
} from "@modules/project/task/enums/task-status.enum";
import { buildDefaultTaskNickname } from "@modules/project/task/helpers/task-nickname.helper";
import {
  isProjectOperatorFromTeam,
  assertTaskProjectNotOnHold,
  isManagementRole,
  TaskActor,
} from "@modules/project/task/helpers/task-security.helper";
import { NotificationService } from "@modules/communication/services/notification.service";
import {
  CreateTaskDto,
  CreateInternalTaskDto,
} from "@modules/project/task/dto/task.dto";
import { TaskInternalCreationService } from "./task-internal-creation.service";

@Injectable()
export class TaskCreationService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Jobs)
    private readonly jobRepository: Repository<Jobs>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(Opportunities)
    private readonly opportunityRepository: Repository<Opportunities>,
    @InjectRepository(OpportunityServiceJobs)
    private readonly oppJobRepository: Repository<OpportunityServiceJobs>,
    private readonly notificationService: NotificationService,
    private readonly internalCreationService: TaskInternalCreationService,
  ) {}

  async createInternalTask(
    data: CreateInternalTaskDto,
    currentUser?: TaskActor,
  ) {
    return this.internalCreationService.createInternalTask(data, currentUser);
  }

  async create(data: CreateTaskDto, currentUser?: TaskActor) {
    if (!data.projectId && !data.opportunityId) {
      throw new BadRequestException("Vui lòng chọn dự án hoặc cơ hội");
    }

    if (!data.jobId) {
      throw new BadRequestException("Vui lòng chọn công việc (Job)");
    }

    const job = await this.jobRepository.findOne({ where: { id: data.jobId } });
    if (!job) throw new NotFoundException("Không tìm thấy công việc (Job)");

    let project: Project | null = null;
    let taskCode: string | null = null;
    let taskSequenceNumber: number | null = null;

    if (data.projectId) {
      project = await this.projectRepository.findOne({
        where: { id: data.projectId },
        relations: [
          "contract",
          "team",
          "team.teamLead",
          "team.members",
          "team.members.user",
          "team.members.roles",
        ],
      });
      if (!project) throw new NotFoundException("Không tìm thấy dự án");
      assertTaskProjectNotOnHold({ project });
      if (!project.contract)
        throw new BadRequestException("Dự án không có hợp đồng liên kết");

      if (currentUser && !isManagementRole(currentUser.role)) {
        if (!isProjectOperatorFromTeam(project.team, currentUser)) {
          throw new ForbiddenException(
            "Bạn không có quyền tạo công việc trong dự án này",
          );
        }
      }

      const contractCode = project.contract.contractCode;
      const jobCode = job.code || `JOB${job.id}`;
      const count = await this.taskRepository.count({
        where: { projectId: data.projectId, jobId: data.jobId },
      });
      taskSequenceNumber = count + 1;
      taskCode = `${contractCode}-${jobCode}-${taskSequenceNumber.toString().padStart(2, "0")}`;
    }

    let opportunity: Opportunities | null = null;
    let opportunityServiceJob: OpportunityServiceJobs | null = null;
    if (data.opportunityId) {
      opportunity = await this.opportunityRepository.findOne({
        where: { id: data.opportunityId },
      });
      if (!opportunity) throw new NotFoundException("Không tìm thấy cơ hội");

      if (!data.opportunityServiceJobId) {
        throw new BadRequestException(
          "Vui lòng chọn hạng mục công việc của cơ hội",
        );
      }
      opportunityServiceJob = await this.oppJobRepository.findOne({
        where: { id: data.opportunityServiceJobId },
        relations: [
          "opportunityService",
          "opportunityService.opportunity",
          "job",
        ],
      });
      if (
        !opportunityServiceJob ||
        opportunityServiceJob.opportunityService?.opportunity?.id !==
          opportunity.id
      ) {
        throw new BadRequestException(
          "Hạng mục công việc không thuộc cơ hội đã chọn",
        );
      }
      if (opportunityServiceJob.jobId !== job.id) {
        throw new BadRequestException(
          "Job của task không khớp hạng mục công việc của cơ hội",
        );
      }

      const count = await this.taskRepository.count({
        where: { opportunityServiceJobId: opportunityServiceJob.id },
      });
      taskSequenceNumber = count + 1;
      taskCode = `${opportunity.opportunityCode}-${job.code || `JOB${job.id}`}-${String(taskSequenceNumber).padStart(2, "0")}`;
    }

    const taskNickname = taskSequenceNumber
      ? buildDefaultTaskNickname(job, taskSequenceNumber)
      : null;
    const task = this.taskRepository.create({
      code: taskCode,
      name: data.name || job.name,
      nickname: taskNickname,
      project: project || undefined,
      projectId: project?.id,
      opportunity: opportunity || undefined,
      opportunityId: opportunity?.id || null,
      opportunityServiceJob: opportunityServiceJob || undefined,
      opportunityServiceJobId: opportunityServiceJob?.id || null,
      job,
      jobId: job.id,
      status: data.isExtra
        ? TaskStatus.AWAITING_PRICING
        : data.assigneeId
          ? TaskStatus.NOT_STARTED
          : TaskStatus.PENDING,
      performerType:
        data.performerType ||
        (job.defaultPerformerType as any) ||
        PerformerType.INTERNAL,
      description: data.description,
      plannedStartDate: data.plannedStartDate,
      plannedEndDate: data.plannedEndDate,
      isExtra: data.isExtra || false,
      pricingStatus: data.isExtra ? PricingStatus.PENDING : null,
      assignerId: currentUser?.userId || currentUser?.id,
    });

    if (data.assigneeId) {
      const user = await this.userRepository.findOneBy({ id: data.assigneeId });
      if (user) {
        task.assignee = user;
        task.assigneeId = user.id;
      }
    }

    const saved = await this.taskRepository.save(task);

    if (saved.assigneeId) {
      await this.notificationService.createNotification({
        title: "Công việc mới được giao",
        content: `Bạn được giao công việc: ${saved.nickname || saved.name}`,
        type: "TASK_ASSIGNED",
        relatedEntityId: saved.id,
        relatedEntityType: "Task",
        link: `/tasks/${saved.id}`,
      });
    }

    return saved;
  }
}
