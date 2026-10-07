import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Quotations } from "@modules/crm/quotation/entities/quotation.entity";

@Injectable()
export class QuotationQueryService {
  constructor(
    @InjectRepository(Quotations)
    private readonly quotationRepository: Repository<Quotations>,
  ) {}

  async getAll(): Promise<Quotations[]> {
    return await this.quotationRepository.find({
      relations: ["details", "details.service", "opportunity", "createdBy"],
      order: { createdAt: "DESC" },
    });
  }

  async getOne(id: string): Promise<Quotations> {
    const quote = await this.quotationRepository.findOne({
      where: { id },
      relations: [
        "details",
        "details.service",
        "details.job",
        "opportunity",
        "createdBy",
      ],
    });
    if (!quote) throw new NotFoundException("Không tìm thấy bảng báo giá");
    return quote;
  }

  async getByOpportunity(opportunityId: string): Promise<Quotations[]> {
    return await this.quotationRepository.find({
      where: { opportunityId },
      relations: ["details", "details.service", "createdBy"],
      order: { version: "DESC" },
    });
  }
}
