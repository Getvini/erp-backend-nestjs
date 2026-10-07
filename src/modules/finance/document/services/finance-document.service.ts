import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AcceptanceMinutes } from "../entities/acceptance-minute.entity";
import { VatInvoices } from "../entities/vat-invoice.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { CreateFinanceDocumentDto } from "../dto/finance-document.dto";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@Injectable()
export class FinanceDocumentService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(AcceptanceMinutes)
    private readonly acceptanceRepo: Repository<AcceptanceMinutes>,
    @InjectRepository(VatInvoices)
    private readonly invoiceRepo: Repository<VatInvoices>,
  ) {}

  private validate(data: CreateFinanceDocumentDto) {
    if (!data.name?.trim() || !data.fileUrl?.trim()) {
      throw new BadRequestException("Tên tài liệu và link file là bắt buộc");
    }
    try {
      const url = new URL(data.fileUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new BadRequestException("Link file không hợp lệ");
      }
    } catch {
      throw new BadRequestException("Link file không hợp lệ");
    }
  }

  private async getAccessibleContract(contractId: string, user: any) {
    const where: any = { id: contractId };
    if (user?.role === UserRole.BD && user?.userId) {
      where.createdBy = { id: user.userId };
    }
    const contract = await this.contractRepo.findOne({ where });
    if (!contract) {
      throw new NotFoundException(
        "Không tìm thấy hợp đồng hoặc không có quyền truy cập",
      );
    }
    return contract;
  }

  async getByContract(contractId: string, user: any) {
    await this.getAccessibleContract(contractId, user);
    const [acceptanceMinutes, vatInvoices] = await Promise.all([
      this.acceptanceRepo.find({
        where: { contractId },
        relations: ["createdBy"],
        order: { createdAt: "DESC" },
      }),
      this.invoiceRepo.find({
        where: { contractId },
        relations: ["createdBy"],
        order: { createdAt: "DESC" },
      }),
    ]);
    return { acceptanceMinutes, vatInvoices };
  }

  async createAcceptanceMinute(dto: CreateFinanceDocumentDto, user: any) {
    const contract = await this.getAccessibleContract(dto.contractId, user);
    this.validate(dto);
    const minute = this.acceptanceRepo.create({
      name: dto.name.trim(),
      fileUrl: dto.fileUrl.trim(),
      contractId: contract.id,
      createdById: user?.userId || user?.id,
    });
    return this.acceptanceRepo.save(minute);
  }

  async createVatInvoice(dto: CreateFinanceDocumentDto, user: any) {
    const contract = await this.getAccessibleContract(dto.contractId, user);
    this.validate(dto);
    const invoice = this.invoiceRepo.create({
      name: dto.name.trim(),
      fileUrl: dto.fileUrl.trim(),
      contractId: contract.id,
      createdById: user?.userId || user?.id,
    });
    return this.invoiceRepo.save(invoice);
  }
}
