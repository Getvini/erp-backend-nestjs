import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { AcceptanceRequests } from "@modules/project/acceptance/entities/acceptance-request.entity";
import { ContractServices } from "@modules/project/acceptance/entities/contract-service.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";
import {
  AcceptanceStatus,
  ContractServiceStatus,
} from "@modules/project/acceptance/enums/acceptance.enum";
import { NotificationService } from "@modules/communication/services/notification.service";

@Injectable()
export class AcceptanceCreateService {
  constructor(
    @InjectRepository(AcceptanceRequests)
    private readonly acceptanceRepo: Repository<AcceptanceRequests>,
    @InjectRepository(ContractServices)
    private readonly serviceRepo: Repository<ContractServices>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Tasks)
    private readonly taskRepo: Repository<Tasks>,
    private readonly notificationService: NotificationService,
  ) {}

  async createRequest(data: {
    serviceIds: string[];
    userId: string;
    projectId: string;
    name?: string;
    note?: string;
  }) {
    const { serviceIds, userId, projectId, note } = data;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw new BadRequestException(
        "Danh sách dịch vụ không hợp lệ hoặc trống",
      );
    }

    const requester = await this.userRepo.findOneBy({ id: userId });
    if (!requester) throw new NotFoundException("Người yêu cầu không tồn tại");

    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException("Dự án không tồn tại");

    if (
      [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED].includes(
        project.status,
      )
    ) {
      throw new BadRequestException(
        "Dự án đã hoàn tất hoặc đã đóng, không thể gửi yêu cầu nghiệm thu",
      );
    }
    if (project.status === ProjectStatus.ON_HOLD || Boolean(project.isOnHold)) {
      throw new ConflictException(
        `Dự án "${project.name}" đang tạm dừng, không thể gửi yêu cầu nghiệm thu`,
      );
    }

    const services = await this.serviceRepo.find({
      where: { id: In(serviceIds) },
      relations: ["contract"],
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestException("Một số hạng mục dịch vụ không tồn tại");
    }

    const firstService = services[0];
    const contractCode = firstService.contract?.contractCode || "UNKNOWN";
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
    const autoName = `NT-${contractCode}-${formattedDate}`;

    for (const s of services) {
      if (s.status === ContractServiceStatus.AWAITING_ACCEPTANCE) {
        throw new BadRequestException(
          `Dịch vụ "${s.name || s.id}" đã được gửi nghiệm thu và đang chờ duyệt. Không thể gửi thêm yêu cầu mới.`,
        );
      }
      if (s.status === ContractServiceStatus.COMPLETED) {
        throw new BadRequestException(
          `Dịch vụ "${s.name || s.id}" đã hoàn thành nghiệm thu.`,
        );
      }
      if (s.status === ContractServiceStatus.CANCELLED) {
        throw new BadRequestException(`Dịch vụ "${s.name || s.id}" đã bị hủy.`);
      }
      if (!s.results || s.results.length === 0) {
        throw new BadRequestException(
          `Dịch vụ "${s.name || s.id}" chưa có kết quả nghiệm thu nội bộ.`,
        );
      }

      const tasks = await this.taskRepo.find({
        where: { contractServiceId: s.id },
      });
      const blockingTasks = tasks.filter(
        (t) =>
          t.status !== TaskStatus.COMPLETED &&
          t.status !== TaskStatus.INTERNAL_COMPLETED &&
          t.status !== TaskStatus.ACCEPTED &&
          t.status !== TaskStatus.ON_HOLD &&
          t.status !== TaskStatus.CANCELLED,
      );
      if (blockingTasks.length > 0) {
        throw new BadRequestException(
          `Dịch vụ "${s.name || s.id}" còn ${blockingTasks.length} công việc chưa hoàn thành. Vui lòng hoàn thành tất cả task trước khi nghiệm thu.`,
        );
      }
    }

    const request = this.acceptanceRepo.create({
      name: autoName,
      requester,
      requesterId: requester.id,
      project,
      projectId,
      note,
      status: AcceptanceStatus.PENDING,
      services,
    });

    const savedRequest = await this.acceptanceRepo.save(request);

    for (const s of services) {
      s.status = ContractServiceStatus.AWAITING_ACCEPTANCE;
      if (s.results) {
        for (const r of s.results) {
          if (r.status === "PENDING" && !r.acceptanceRequestId) {
            r.acceptanceRequestId = savedRequest.id;
          }
        }
      }
      await this.serviceRepo.save(s);
    }

    const bods = await this.userRepo
      .createQueryBuilder("user")
      .innerJoin("user.accounts", "account")
      .where("account.role IN (:...roles)", {
        roles: ["BOD", "ADMIN", "ADMIN_SALE", "PM"],
      })
      .getMany();

    for (const bod of bods) {
      await this.notificationService.createNotification({
        title: "Yêu cầu nghiệm thu mới",
        content: ` ${requester.fullName} yêu cầu nghiệm thu đợt: ${savedRequest.name} của dự án ${project.name}`,
        type: "ACCEPTANCE_REQUESTED",
        recipient: bod,
        relatedEntityId: savedRequest.id,
        relatedEntityType: "AcceptanceRequest",
        link: `/acceptance`,
      });
    }

    return savedRequest;
  }
}
