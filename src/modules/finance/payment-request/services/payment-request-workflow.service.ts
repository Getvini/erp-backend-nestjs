import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { computePaymentStatus } from "./payment-request-query.service";
import {
  ReviewPaymentRequestDto,
  BodDecisionDto,
  PayPaymentRequestDto,
} from "../dto/payment-request.dto";

@Injectable()
export class PaymentRequestWorkflowService {
  constructor(
    @InjectRepository(PaymentRequests)
    private readonly repo: Repository<PaymentRequests>,
    @InjectRepository(Tasks)
    private readonly taskRepo: Repository<Tasks>,
  ) {}

  private pushHistory(request: PaymentRequests, entry: any) {
    request.history = [
      ...(request.history || []),
      { ...entry, at: new Date().toISOString() },
    ];
  }

  async review(
    id: string,
    dto: ReviewPaymentRequestDto,
    reviewerId: string,
    _reviewerRole: string,
  ) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    if (
      request.approvalStatus !== PaymentRequestApprovalStatus.PENDING_REVIEWER
    ) {
      throw new BadRequestException(
        "Yêu cầu thanh toán không ở trạng thái chờ duyệt",
      );
    }

    if (
      (dto.action === "REJECT" || dto.action === "NEED_MORE_DOCS") &&
      (!dto.note || !dto.note.trim())
    ) {
      throw new BadRequestException("Vui lòng nhập lý do");
    }

    request.reviewerId = reviewerId;
    request.reviewedAt = new Date();
    request.reviewNote = dto.note || null;

    if (dto.action === "SUBMIT_TO_BOD") {
      request.approvalStatus = PaymentRequestApprovalStatus.PENDING_BOD;
      request.submittedToBodById = reviewerId;
      request.submittedToBodAt = new Date();
    } else if (dto.action === "REJECT") {
      request.approvalStatus = PaymentRequestApprovalStatus.REJECTED;
    } else if (dto.action === "NEED_MORE_DOCS") {
      request.approvalStatus = PaymentRequestApprovalStatus.NEED_MORE_DOCS;
    }

    this.pushHistory(request, {
      action: "REVIEWED",
      byId: reviewerId,
      note: dto.note || null,
    });
    return this.repo.save(request);
  }

  async bodDecision(id: string, dto: BodDecisionDto, bodUserId: string) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    if (request.approvalStatus !== PaymentRequestApprovalStatus.PENDING_BOD) {
      throw new BadRequestException(
        "Yêu cầu thanh toán không ở trạng thái chờ BOD xác nhận",
      );
    }

    request.bodDecisionById = bodUserId;
    request.bodDecisionAt = new Date();
    request.bodDecisionReason = dto.reason || null;

    if (dto.action === "APPROVE") {
      request.approvalStatus = PaymentRequestApprovalStatus.APPROVED;
      if (dto.confirmedDueDate) {
        request.confirmedDueDate = new Date(dto.confirmedDueDate);
        request.confirmedDueDateById = bodUserId;
      }
      if (request.taskId) {
        const task = await this.taskRepo.findOne({
          where: { id: request.taskId },
        });
        if (task) {
          task.spentAmount =
            Number(task.spentAmount || 0) + Number(request.amount);
          await this.taskRepo.save(task);
        }
      }
    } else if (dto.action === "REJECT") {
      if (!dto.reason?.trim())
        throw new BadRequestException("Vui lòng nhập lý do từ chối");
      request.approvalStatus = PaymentRequestApprovalStatus.REJECTED;
    }

    request.paymentStatus = computePaymentStatus(request);
    this.pushHistory(request, {
      action: "BOD_DECISION",
      byId: bodUserId,
      note: dto.reason || null,
    });
    return this.repo.save(request);
  }

  async pay(id: string, dto: PayPaymentRequestDto, payerId?: string) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    if (request.approvalStatus !== PaymentRequestApprovalStatus.APPROVED) {
      throw new BadRequestException(
        "Yêu cầu thanh toán chưa được BOD xác nhận",
      );
    }

    if (dto.paymentMethod) request.paymentMethod = dto.paymentMethod;
    if (dto.cashVoucherInfo) request.cashVoucherInfo = dto.cashVoucherInfo;
    if (dto.paymentProofs) {
      request.paymentProofs = dto.paymentProofs.map((f: any) => ({
        ...f,
        uploadedAt: f.uploadedAt || new Date().toISOString(),
      }));
    }

    request.paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    request.paymentStatus = PaymentDueStatus.PAID;

    this.pushHistory(request, {
      action: "PAID",
      byId: payerId || "system",
      note:
        dto.paymentMethod === "CASH" ? "Chi tiền mặt" : "Chi bằng chuyển khoản",
    });
    return this.repo.save(request);
  }

  async uploadPaymentProof(id: string, file: any) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    request.paymentProofs = [
      ...(request.paymentProofs || []),
      { ...file, uploadedAt: new Date().toISOString() },
    ];
    return this.repo.save(request);
  }

  async cancel(
    id: string,
    actorId: string,
    actorRole: string,
    reason?: string,
  ) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    if (request.paidAt || request.paymentStatus === PaymentDueStatus.PAID) {
      throw new BadRequestException(
        "Yêu cầu thanh toán đã được chi tiền, không thể hủy",
      );
    }
    if (request.approvalStatus === PaymentRequestApprovalStatus.CANCELLED) {
      throw new BadRequestException("Yêu cầu thanh toán đã bị hủy trước đó");
    }

    const isBodOrAdmin = [UserRole.BOD, UserRole.ADMIN].includes(
      actorRole as UserRole,
    );
    if (request.approvalStatus === PaymentRequestApprovalStatus.APPROVED) {
      if (!isBodOrAdmin) {
        throw new ForbiddenException(
          "Bạn không có quyền hủy yêu cầu thanh toán đã được duyệt",
        );
      }
      if (request.taskId) {
        const task = await this.taskRepo.findOne({
          where: { id: request.taskId },
        });
        if (task) {
          task.spentAmount = Math.max(
            0,
            Number(task.spentAmount || 0) - Number(request.amount),
          );
          await this.taskRepo.save(task);
        }
      }
    } else {
      if (request.requesterId !== actorId && !isBodOrAdmin) {
        throw new ForbiddenException("Bạn không phải người tạo yêu cầu này");
      }
    }

    request.approvalStatus = PaymentRequestApprovalStatus.CANCELLED;
    this.pushHistory(request, {
      action: "CANCELLED",
      byId: actorId,
      note: reason || null,
    });
    return this.repo.save(request);
  }
}
