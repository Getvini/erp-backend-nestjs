import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customers } from "@modules/crm/customer/entities/customer.entity";
import { CreateCustomerDto, UpdateCustomerDto } from "@modules/crm/customer/dto/customer.dto";
import { TaxVerificationService } from "./tax-verification.service";
import { CustomerQueryService } from "./customer-query.service";
import { ReferralPartners } from "@modules/crm/service/entities/referral-partner.entity";
import { Users } from "@modules/identity/user/entities/user.entity";

@Injectable()
export class CustomerActionService {
  constructor(
    @InjectRepository(Customers)
    private readonly customerRepository: Repository<Customers>,
    private readonly taxVerificationService: TaxVerificationService,
    private readonly customerQueryService: CustomerQueryService,
  ) {}

  async create(dto: CreateCustomerDto, user?: any): Promise<Customers> {
    const phone = dto.phone || dto.phoneNumber || "";
    if (dto.taxId) {
      await this.taxVerificationService.checkCustomerTaxId(dto.taxId);
    }

    const customer = this.customerRepository.create({
      name: dto.name,
      phone,
      email: dto.email,
      address: dto.address,
      taxId: dto.taxId,
      source: dto.source,
      createdBy: user?.userId ? ({ id: user.userId } as Users) : null,
      referralPartner: dto.referralPartnerId
        ? ({ id: dto.referralPartnerId } as ReferralPartners)
        : null,
    });

    return await this.customerRepository.save(customer);
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    user?: any,
  ): Promise<Customers> {
    const customer = await this.customerQueryService.getOne(id, user);

    if (dto.taxId && dto.taxId !== customer.taxId) {
      await this.taxVerificationService.checkCustomerTaxId(dto.taxId, id);
    }

    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.phone || dto.phoneNumber) {
      customer.phone = dto.phone || dto.phoneNumber || customer.phone;
    }
    if (dto.email !== undefined) customer.email = dto.email;
    if (dto.address !== undefined) customer.address = dto.address;
    if (dto.taxId !== undefined) customer.taxId = dto.taxId;
    if (dto.source !== undefined) customer.source = dto.source;
    if (dto.referralPartnerId !== undefined) {
      customer.referralPartner = dto.referralPartnerId
        ? ({ id: dto.referralPartnerId } as ReferralPartners)
        : null;
    }

    return await this.customerRepository.save(customer);
  }

  async delete(id: string, user?: any): Promise<{ message: string }> {
    const customer = await this.customerQueryService.getOne(id, user);
    await this.customerRepository.softRemove(customer);
    return { message: "Xóa khách hàng thành công" };
  }
}
