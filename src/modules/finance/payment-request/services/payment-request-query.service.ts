import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PaymentRequests,
  PaymentRequestApprovalStatus,
  PaymentDueStatus,
} from "../entities/payment-request.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { QueryPaymentRequestDto } from "../dto/payment-request.dto";

const DUE_SOON_DAYS = 3;
const FULL_VISIBILITY_ROLES: UserRole[] = [
  UserRole.ADMIN_SALE,
  UserRole.BOD,
  UserRole.ADMIN,
];

export const computePaymentStatus = (
  request: PaymentRequests,
): PaymentDueStatus => {
  if (request.paidAt || request.paymentStatus === PaymentDueStatus.PAID) {
    return PaymentDueStatus.PAID;
  }
  if (
    [
      PaymentRequestApprovalStatus.REJECTED,
      PaymentRequestApprovalStatus.CANCELLED,
    ].includes(request.approvalStatus)
  ) {
    return PaymentDueStatus.NOT_APPLICABLE;
  }
  if (request.approvalStatus !== PaymentRequestApprovalStatus.APPROVED) {
    return PaymentDueStatus.WAITING;
  }

  const effectiveDueDate = request.confirmedDueDate || request.dueDate;
  const dueDate = new Date(effectiveDueDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return PaymentDueStatus.OVERDUE;
  if (diffDays <= DUE_SOON_DAYS) return PaymentDueStatus.DUE_SOON;
  return PaymentDueStatus.WAITING;
};

@Injectable()
export class PaymentRequestQueryService {
  constructor(
    @InjectRepository(PaymentRequests)
    private readonly repo: Repository<PaymentRequests>,
    @InjectRepository(Tasks)
    private readonly taskRepo: Repository<Tasks>,
  ) {}

  private relations = [
    "project",
    "task",
    "vendor",
    "requester",
    "reviewer",
    "confirmedDueDateBy",
    "submittedToBodBy",
    "bodDecisionBy",
  ];

  async getAll(query: QueryPaymentRequestDto, user?: any) {
    const qb = this.repo
      .createQueryBuilder("pr")
      .leftJoinAndSelect("pr.project", "project")
      .leftJoinAndSelect("pr.task", "task")
      .leftJoinAndSelect("pr.vendor", "vendor")
      .leftJoinAndSelect("pr.requester", "requester")
      .leftJoinAndSelect("pr.reviewer", "reviewer")
      .leftJoinAndSelect("pr.bodDecisionBy", "bodDecisionBy");

    if (query.search) {
      qb.andWhere("pr.content ILIKE :search", { search: `%${query.search}%` });
    }
    if (query.type) {
      qb.andWhere("pr.type = :type", { type: query.type });
    }
    if (query.approvalStatus) {
      qb.andWhere("pr.approvalStatus = :approvalStatus", {
        approvalStatus: query.approvalStatus,
      });
    }
    if (query.projectId) {
      qb.andWhere("pr.projectId = :projectId", { projectId: query.projectId });
    }

    const dateCol =
      query.sortBy === "createdAt"
        ? "pr.createdAt"
        : "COALESCE(pr.confirmedDueDate, pr.dueDate)";
    if (query.fromDate) {
      qb.andWhere(`${dateCol} >= :fromDate`, {
        fromDate: new Date(`${query.fromDate}T00:00:00.000`),
      });
    }
    if (query.toDate) {
      qb.andWhere(`${dateCol} <= :toDate`, {
        toDate: new Date(`${query.toDate}T23:59:59.999`),
      });
    }
    if (query.minAmount !== undefined) {
      qb.andWhere("pr.amount >= :minAmount", {
        minAmount: Number(query.minAmount),
      });
    }
    if (query.maxAmount !== undefined) {
      qb.andWhere("pr.amount <= :maxAmount", {
        maxAmount: Number(query.maxAmount),
      });
    }

    if (user && !FULL_VISIBILITY_ROLES.includes(user.role)) {
      qb.andWhere("pr.requesterId = :viewerId", {
        viewerId: user.userId || user.id,
      });
    }

    const sortColumn =
      query.sortBy === "amount"
        ? "pr.amount"
        : query.sortBy === "dueDate"
          ? "pr.dueDate"
          : "pr.createdAt";
    qb.orderBy(sortColumn, query.sortOrder === "ASC" ? "ASC" : "DESC");

    const results = await qb.getMany();
    const withComputed = results.map((r) => {
      r.paymentStatus = computePaymentStatus(r);
      return r;
    });

    if (query.paymentStatus) {
      return withComputed.filter(
        (r) => r.paymentStatus === query.paymentStatus,
      );
    }
    return withComputed;
  }

  async getOne(id: string, user?: any) {
    const req = await this.repo.findOne({
      where: { id },
      relations: this.relations,
    });
    if (!req) throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");

    if (user && !FULL_VISIBILITY_ROLES.includes(user.role)) {
      if (req.requesterId !== (user.userId || user.id)) {
        throw new ForbiddenException(
          "Bạn không có quyền xem yêu cầu thanh toán này",
        );
      }
    }
    req.paymentStatus = computePaymentStatus(req);
    return req;
  }

  async getTaskSpent(taskId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");

    const cost = Number(task.cost || 0);
    const spentAmount = Number(task.spentAmount || 0);
    return {
      taskId,
      cost,
      spentAmount,
      remainingAmount: cost - spentAmount,
    };
  }

  async getTotalDebt(query: QueryPaymentRequestDto, user?: any) {
    const qb = this.repo
      .createQueryBuilder("pr")
      .where("pr.approvalStatus = :approved", {
        approved: PaymentRequestApprovalStatus.APPROVED,
      })
      .andWhere("pr.paidAt IS NULL");

    if (query.search) {
      qb.andWhere("pr.content ILIKE :search", { search: `%${query.search}%` });
    }
    if (query.type) {
      qb.andWhere("pr.type = :type", { type: query.type });
    }
    if (query.projectId) {
      qb.andWhere("pr.projectId = :projectId", { projectId: query.projectId });
    }
    if (user && !FULL_VISIBILITY_ROLES.includes(user.role)) {
      qb.andWhere("pr.requesterId = :viewerId", {
        viewerId: user.userId || user.id,
      });
    }

    const raw = await qb
      .select([
        "COALESCE(SUM(pr.amount), 0) AS total",
        "COALESCE(SUM(CASE WHEN pr.type = 'PROJECT' THEN pr.amount ELSE 0 END), 0) AS project_debt",
        "COALESCE(SUM(CASE WHEN pr.type = 'OTHER_WORK' THEN pr.amount ELSE 0 END), 0) AS other_work_debt",
      ])
      .getRawOne();

    return {
      totalDebt: Number(raw?.total || 0),
      projectDebt: Number(raw?.project_debt || 0),
      otherWorkDebt: Number(raw?.other_work_debt || 0),
    };
  }
}
