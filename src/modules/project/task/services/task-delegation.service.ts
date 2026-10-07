import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { TaskStatus, SubtaskPlanStatus } from "@modules/project/task/enums/task-status.enum";
import {
  assertTaskProjectNotOnHold,
  TaskActor,
} from "@modules/project/task/helpers/task-security.helper";
import { CreateSubtaskDto } from "@modules/project/task/dto/task.dto";

@Injectable()
export class TaskDelegationService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  async requestStaffing(taskId: string, note?: string, _actor?: TaskActor) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ["project"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);

    task.isSupportRequested = true;
    task.supportRequestNote = note || "Yêu cầu bổ sung nhân sự";
    task.supportRequestType = "STAFFING";
    return this.taskRepository.save(task);
  }

  async respondStaffingRequest(
    taskId: string,
    _action: "RESOLVE" | "REJECT",
    _actor?: TaskActor,
  ) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ["project"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);

    task.isSupportRequested = false;
    task.supportRequestType = null;
    return this.taskRepository.save(task);
  }

  async createSubtask(
    parentTaskId: string,
    data: CreateSubtaskDto,
    currentUser?: TaskActor,
  ) {
    const parentTask = await this.taskRepository.findOne({
      where: { id: parentTaskId },
      relations: [
        "project",
        "project.team",
        "project.team.teamLead",
        "project.team.members",
        "subtasks",
        "job",
      ],
    });

    if (!parentTask)
      throw new NotFoundException("Không tìm thấy công việc cha");
    assertTaskProjectNotOnHold(parentTask);
    if (parentTask.parentTaskId) {
      throw new BadRequestException(
        "Không thể tạo subtask bên trong một subtask khác",
      );
    }

    const currentSubtasks = parentTask.subtasks || [];
    const currentAllocated = currentSubtasks.reduce(
      (sum, s) => sum + Number(s.allocationPercent || 0),
      0,
    );
    if (currentAllocated + data.allocationPercent > 100) {
      throw new BadRequestException(
        `Tổng % phân bổ (${currentAllocated + data.allocationPercent}%) vượt quá 100%`,
      );
    }

    let assignee: Users | null = null;
    if (data.assigneeId) {
      assignee = await this.userRepository.findOneBy({ id: data.assigneeId });
    }

    const subtask = this.taskRepository.create({
      name: data.name,
      parentTaskId: parentTask.id,
      parentTask,
      project: parentTask.project,
      projectId: parentTask.projectId,
      opportunityId: parentTask.opportunityId,
      opportunityServiceJobId: parentTask.opportunityServiceJobId,
      job: parentTask.job,
      jobId: parentTask.jobId,
      assignee: assignee || undefined,
      assigneeId: assignee?.id,
      assignerId: currentUser?.userId || currentUser?.id,
      allocationPercent: data.allocationPercent,
      description: data.description,
      status: assignee ? TaskStatus.NOT_STARTED : TaskStatus.PENDING,
      plannedStartDate: parentTask.plannedStartDate,
      plannedEndDate: parentTask.plannedEndDate,
    });

    const saved = await this.taskRepository.save(subtask);
    parentTask.subtaskPlanStatus = SubtaskPlanStatus.DRAFT;
    await this.taskRepository.save(parentTask);

    return saved;
  }

  async updateSubtask(
    subtaskId: string,
    data: CreateSubtaskDto,
    _actor?: TaskActor,
  ) {
    const subtask = await this.taskRepository.findOne({
      where: { id: subtaskId },
      relations: ["parentTask", "parentTask.subtasks"],
    });
    if (!subtask) throw new NotFoundException("Không tìm thấy subtask");
    if (!subtask.parentTaskId)
      throw new BadRequestException("Công việc này không phải là subtask");

    const siblings =
      subtask.parentTask?.subtasks?.filter((s) => s.id !== subtask.id) || [];
    const siblingAllocated = siblings.reduce(
      (sum, s) => sum + Number(s.allocationPercent || 0),
      0,
    );
    if (siblingAllocated + data.allocationPercent > 100) {
      throw new BadRequestException(
        `Tổng % phân bổ (${siblingAllocated + data.allocationPercent}%) vượt quá 100%`,
      );
    }

    subtask.name = data.name;
    subtask.allocationPercent = data.allocationPercent;
    if (data.description !== undefined) subtask.description = data.description;
    if (data.assigneeId) {
      subtask.assignee =
        (await this.userRepository.findOneBy({ id: data.assigneeId })) ||
        (null as any);
      subtask.assigneeId = subtask.assignee?.id || (null as any);
    }

    return this.taskRepository.save(subtask);
  }

  async submitSubtaskPlan(parentTaskId: string, currentUser?: TaskActor) {
    const parent = await this.taskRepository.findOne({
      where: { id: parentTaskId },
    });
    if (!parent) throw new NotFoundException("Không tìm thấy công việc cha");
    parent.subtaskPlanStatus = SubtaskPlanStatus.PENDING_APPROVAL;
    parent.subtaskPlanRequesterId =
      currentUser?.userId || currentUser?.id || null;
    return this.taskRepository.save(parent);
  }

  async respondSubtaskPlan(
    parentTaskId: string,
    action: "APPROVE" | "REJECT",
    note?: string,
    currentUser?: TaskActor,
  ) {
    const parent = await this.taskRepository.findOne({
      where: { id: parentTaskId },
    });
    if (!parent) throw new NotFoundException("Không tìm thấy công việc cha");
    parent.subtaskPlanStatus =
      action === "APPROVE"
        ? SubtaskPlanStatus.APPROVED
        : SubtaskPlanStatus.DRAFT;
    parent.subtaskPlanReviewerId =
      currentUser?.userId || currentUser?.id || null;
    parent.subtaskPlanReviewNote = note || null;
    return this.taskRepository.save(parent);
  }
}
