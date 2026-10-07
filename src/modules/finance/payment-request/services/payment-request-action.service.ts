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
import {
  CreatePaymentRequestDto,
  UpdatePaymentRequestDto,
  SupplementPaymentRequestDto,
} from "../dto/payment-request.dto";

@Injectable()
export class PaymentRequestActionService {
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

  async create(dto: CreatePaymentRequestDto, requesterId: string) {
    if (!dto.content?.trim()) {
      throw new BadRequestException(
        "Vui lòng nhập nội dung yêu cầu thanh toán",
      );
    }
    if (!dto.amount || Number(dto.amount) <= 0) {
      throw new BadRequestException(
        "Vui lòng nhập số tiền thanh toán hợp lệ lớn hơn 0",
      );
    }
    if (!dto.dueDate) {
      throw new BadRequestException("Vui lòng chọn thời hạn thanh toán");
    }

    const invoiceImages = dto.invoiceImages || [];
    const invoicePdfs = dto.invoicePdfs || [];
    if (invoiceImages.length === 0 && invoicePdfs.length === 0) {
      throw new BadRequestException(
        "Vui lòng đính kèm ít nhất một file hóa đơn hoặc chứng từ",
      );
    }

    const request = this.repo.create({
      type: dto.type,
      content: dto.content.trim(),
      amount: dto.amount,
      dueDate: dto.dueDate,
      projectId: dto.projectId || null,
      taskId: dto.taskId || null,
      vendorId: dto.vendorId || null,
      invoiceImages,
      invoicePdfs,
      requesterId,
      approvalStatus: PaymentRequestApprovalStatus.PENDING_REVIEWER,
      paymentStatus: PaymentDueStatus.WAITING,
    });

    if (dto.taskId) {
      const task = await this.taskRepo.findOne({ where: { id: dto.taskId } });
      if (task) request.costPrice = task.cost;
    }

    this.pushHistory(request, {
      action: "CREATED",
      byId: requesterId,
      snapshot: {
        content: request.content,
        amount: request.amount,
        dueDate: request.dueDate,
        invoiceImages: request.invoiceImages,
        invoicePdfs: request.invoicePdfs,
      },
    });

    return this.repo.save(request);
  }

  async update(id: string, dto: UpdatePaymentRequestDto) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");

    if (dto.content !== undefined) request.content = dto.content.trim();
    if (dto.amount !== undefined) request.amount = dto.amount;
    if (dto.dueDate !== undefined) request.dueDate = dto.dueDate;
    if (dto.invoiceImages !== undefined)
      request.invoiceImages = dto.invoiceImages;
    if (dto.invoicePdfs !== undefined) request.invoicePdfs = dto.invoicePdfs;

    return this.repo.save(request);
  }

  async submit(id: string, requesterId: string) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    if (request.approvalStatus !== PaymentRequestApprovalStatus.DRAFT) {
      throw new BadRequestException(
        "Chỉ có thể gửi duyệt yêu cầu đang ở trạng thái nháp",
      );
    }
    if (request.requesterId !== requesterId) {
      throw new ForbiddenException("Bạn không phải người tạo yêu cầu này");
    }

    request.approvalStatus = PaymentRequestApprovalStatus.PENDING_REVIEWER;
    this.pushHistory(request, { action: "SUBMITTED", byId: requesterId });
    return this.repo.save(request);
  }

  async supplement(
    id: string,
    dto: SupplementPaymentRequestDto,
    requesterId: string,
  ) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    if (
      request.approvalStatus !== PaymentRequestApprovalStatus.NEED_MORE_DOCS
    ) {
      throw new BadRequestException(
        "Yêu cầu thanh toán không ở trạng thái cần bổ sung",
      );
    }
    if (request.requesterId !== requesterId) {
      throw new ForbiddenException("Bạn không phải người tạo yêu cầu này");
    }

    this.pushHistory(request, {
      action: "SUPPLEMENTED",
      byId: requesterId,
      note: dto.note || null,
      snapshot: {
        content: request.content,
        amount: request.amount,
        dueDate: request.dueDate,
        invoiceImages: request.invoiceImages,
        invoicePdfs: request.invoicePdfs,
      },
    });

    if (dto.content !== undefined) request.content = dto.content;
    if (dto.amount !== undefined) request.amount = dto.amount;
    if (dto.dueDate !== undefined) request.dueDate = dto.dueDate;
    if (dto.invoiceImages !== undefined)
      request.invoiceImages = dto.invoiceImages;
    if (dto.invoicePdfs !== undefined) request.invoicePdfs = dto.invoicePdfs;

    request.approvalStatus = PaymentRequestApprovalStatus.PENDING_REVIEWER;
    request.reviewNote = null;
    return this.repo.save(request);
  }

  async addInvoicePdf(id: string, file: any) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    request.invoicePdfs = [
      ...(request.invoicePdfs || []),
      { ...file, uploadedAt: new Date().toISOString() },
    ];
    return this.repo.save(request);
  }

  async delete(id: string) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    if (request.approvalStatus !== PaymentRequestApprovalStatus.DRAFT) {
      throw new BadRequestException(
        "Chỉ xóa được yêu cầu thanh toán ở trạng thái nháp",
      );
    }
    await this.repo.remove(request);
    return { message: "Đã xóa yêu cầu thanh toán" };
  }
}
