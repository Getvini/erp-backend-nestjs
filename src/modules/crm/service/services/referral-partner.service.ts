import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ReferralPartners } from "../entities/referral-partner.entity";
import {
  CreateReferralPartnerDto,
  UpdateReferralPartnerDto,
} from "../dto/referral-partner.dto";

@Injectable()
export class ReferralPartnerService {
  constructor(
    @InjectRepository(ReferralPartners)
    private readonly partnerRepository: Repository<ReferralPartners>,
  ) {}

  async getAll(): Promise<ReferralPartners[]> {
    return await this.partnerRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async getOne(id: string): Promise<ReferralPartners> {
    const partner = await this.partnerRepository.findOne({
      where: { id },
    });
    if (!partner) throw new NotFoundException("Không tìm thấy đối tác");
    return partner;
  }

  async create(dto: CreateReferralPartnerDto): Promise<ReferralPartners> {
    const partner = this.partnerRepository.create(dto);
    return await this.partnerRepository.save(partner);
  }

  async update(
    id: string,
    dto: UpdateReferralPartnerDto,
  ): Promise<ReferralPartners> {
    const partner = await this.getOne(id);
    Object.assign(partner, dto);
    return await this.partnerRepository.save(partner);
  }

  async delete(id: string): Promise<{ message: string }> {
    const partner = await this.getOne(id);
    await this.partnerRepository.softRemove(partner);
    return { message: "Xóa đối tác thành công" };
  }
}
