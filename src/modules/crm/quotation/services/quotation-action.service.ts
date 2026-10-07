import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Quotations } from "@modules/crm/quotation/entities/quotation.entity";
import { QuotationDetails } from "@modules/crm/quotation/entities/quotation-detail.entity";
import { CreateQuotationDto, UpdateQuotationDto } from "@modules/crm/quotation/dto/quotation.dto";
import { QuotationStatus, QuotationType } from "@modules/crm/quotation/enums/quotation-status.enum";
import { QuotationQueryService } from "./quotation-query.service";

@Injectable()
export class QuotationActionService {
  constructor(
    @InjectRepository(Quotations)
    private readonly quoteRepo: Repository<Quotations>,
    @InjectRepository(QuotationDetails)
    private readonly detailRepo: Repository<QuotationDetails>,
    private readonly queryService: QuotationQueryService,
  ) {}

  private calculateTotals(
    details: any[],
    vatRate = 8,
  ): {
    totalAmount: number;
    vatRate: number;
    vatAmount: number;
    totalWithVat: number;
  } {
    let totalAmount = 0;
    for (const d of details || []) {
      const sp = Number(d.sellingPrice) || 0;
      const q = Number(d.quantity) || 1;
      const pq = Number(d.packageQuantity) || 1;
      totalAmount += sp * q * pq;
    }
    const rate = Number(vatRate) || 8;
    const vatAmount = totalAmount * (rate / 100);
    const totalWithVat = totalAmount + vatAmount;

    return { totalAmount, vatRate: rate, vatAmount, totalWithVat };
  }

  async create(dto: CreateQuotationDto, user?: any): Promise<Quotations> {
    const totals = this.calculateTotals(dto.details, dto.vatRate);
    const existingQuotes = await this.quoteRepo.find({
      where: { opportunityId: dto.opportunityId },
    });
    const nextVersion = existingQuotes.length + 1;

    const quote = this.quoteRepo.create({
      opportunityId: dto.opportunityId,
      note: dto.note,
      description: dto.description,
      version: nextVersion,
      status: QuotationStatus.DRAFT,
      type: QuotationType.INITIAL,
      ...totals,
      createdById: user?.userId || user?.id,
    });

    const saved = await this.quoteRepo.save(quote);

    if (dto.details && Array.isArray(dto.details)) {
      for (const d of dto.details) {
        const detail = this.detailRepo.create({
          quotationId: saved.id,
          serviceId: d.serviceId,
          jobId: d.jobId,
          quantity: d.quantity || 1,
          sellingPrice: d.sellingPrice || 0,
          costAtSale: d.costAtSale || 0,
          name: d.name,
          packageQuantity: d.packageQuantity || 1,
          packageName: d.packageName,
          servicePackageId: d.servicePackageId,
          isPackageService: d.isPackageService || false,
        });
        await this.detailRepo.save(detail);
      }
    }

    return await this.queryService.getOne(saved.id);
  }

  async createAddendum(
    dto: CreateQuotationDto,
    user?: any,
  ): Promise<Quotations> {
    const totals = this.calculateTotals(dto.details, dto.vatRate);
    const quote = this.quoteRepo.create({
      opportunityId: dto.opportunityId,
      note: dto.note,
      description: dto.description,
      version: 1,
      status: QuotationStatus.DRAFT,
      type: QuotationType.ADDENDUM,
      ...totals,
      createdById: user?.userId || user?.id,
    });

    const saved = await this.quoteRepo.save(quote);
    if (dto.details && Array.isArray(dto.details)) {
      for (const d of dto.details) {
        const detail = this.detailRepo.create({
          quotationId: saved.id,
          serviceId: d.serviceId,
          jobId: d.jobId,
          quantity: d.quantity || 1,
          sellingPrice: d.sellingPrice || 0,
          costAtSale: d.costAtSale || 0,
          name: d.name,
          packageQuantity: d.packageQuantity || 1,
          packageName: d.packageName,
          servicePackageId: d.servicePackageId,
          isPackageService: d.isPackageService || false,
        });
        await this.detailRepo.save(detail);
      }
    }
    return await this.queryService.getOne(saved.id);
  }

  async update(id: string, dto: UpdateQuotationDto): Promise<Quotations> {
    const quote = await this.queryService.getOne(id);
    const details = dto.details ?? quote.details;
    const totals = this.calculateTotals(details, dto.vatRate ?? quote.vatRate);

    Object.assign(quote, {
      note: dto.note ?? quote.note,
      description: dto.description ?? quote.description,
      ...totals,
    });
    await this.quoteRepo.save(quote);

    if (dto.details && Array.isArray(dto.details)) {
      await this.detailRepo.delete({ quotationId: id });
      for (const d of dto.details) {
        const detail = this.detailRepo.create({
          quotationId: id,
          serviceId: d.serviceId,
          jobId: d.jobId,
          quantity: d.quantity || 1,
          sellingPrice: d.sellingPrice || 0,
          costAtSale: d.costAtSale || 0,
          name: d.name,
          packageQuantity: d.packageQuantity || 1,
          packageName: d.packageName,
          servicePackageId: d.servicePackageId,
          isPackageService: d.isPackageService || false,
        });
        await this.detailRepo.save(detail);
      }
    }

    return await this.queryService.getOne(id);
  }

  async approve(id: string): Promise<Quotations> {
    const quote = await this.queryService.getOne(id);
    quote.status = QuotationStatus.APPROVED;
    await this.quoteRepo.save(quote);
    return await this.queryService.getOne(id);
  }

  async reject(id: string, _reason?: string): Promise<Quotations> {
    const quote = await this.queryService.getOne(id);
    quote.status = QuotationStatus.REJECTED;
    await this.quoteRepo.save(quote);
    return await this.queryService.getOne(id);
  }

  async delete(id: string): Promise<{ message: string }> {
    const quote = await this.queryService.getOne(id);
    await this.quoteRepo.softRemove(quote);
    return { message: "Xóa bảng báo giá thành công" };
  }
}
