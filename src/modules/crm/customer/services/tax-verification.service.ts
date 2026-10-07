import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not } from "typeorm";
import { Customers } from "@modules/crm/customer/entities/customer.entity";

@Injectable()
export class TaxVerificationService {
  constructor(
    @InjectRepository(Customers)
    private readonly customerRepository: Repository<Customers>,
  ) {}

  async checkCustomerTaxId(taxId?: string, excludeId?: string): Promise<void> {
    if (!taxId || !taxId.trim()) return;

    const trimmedTaxId = taxId.trim();
    const existing = await this.customerRepository.findOne({
      where: {
        taxId: trimmedTaxId,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (existing) {
      throw new BadRequestException("Khách hàng này đã tồn tại trên hệ thống");
    }

    // Kiểm tra thêm trên bảng opportunities nếu bảng tồn tại
    const oppCount = await this.customerRepository.query(
      `SELECT id FROM opportunities WHERE "leadTaxId" = $1 AND "deletedAt" IS NULL LIMIT 1`,
      [trimmedTaxId],
    );

    if (oppCount && oppCount.length > 0) {
      throw new BadRequestException(
        "Mã số thuế này đã tồn tại trên hệ thống (Cơ hội)",
      );
    }
  }

  async checkOpportunityTaxId(
    taxId?: string,
    excludeOppId?: string,
  ): Promise<void> {
    if (!taxId || !taxId.trim()) return;

    const trimmedTaxId = taxId.trim();
    const existingCustomer = await this.customerRepository.findOne({
      where: { taxId: trimmedTaxId },
    });

    if (existingCustomer) {
      throw new BadRequestException("Khách hàng này đã tồn tại trên hệ thống");
    }

    const query = excludeOppId
      ? `SELECT id FROM opportunities WHERE "leadTaxId" = $1 AND id != $2 AND "deletedAt" IS NULL LIMIT 1`
      : `SELECT id FROM opportunities WHERE "leadTaxId" = $1 AND "deletedAt" IS NULL LIMIT 1`;
    const params = excludeOppId ? [trimmedTaxId, excludeOppId] : [trimmedTaxId];

    const existingOpp = await this.customerRepository.query(query, params);
    if (existingOpp && existingOpp.length > 0) {
      throw new BadRequestException(
        "Mã số thuế này đã tồn tại trên hệ thống (Cơ hội)",
      );
    }
  }
}
