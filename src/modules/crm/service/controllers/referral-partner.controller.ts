import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { ReferralPartnerService } from "../services/referral-partner.service";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  CreateReferralPartnerDto,
  UpdateReferralPartnerDto,
} from "../dto/referral-partner.dto";

@ApiTags("CRM - Referral Partner")
@ApiBearerAuth()
@Controller("referral-partners")
export class ReferralPartnerController {
  constructor(
    private readonly referralPartnerService: ReferralPartnerService,
  ) {}

  @Get()
  async getAll() {
    return await this.referralPartnerService.getAll();
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return await this.referralPartnerService.getOne(id);
  }

  @Post()
  async create(@Body() dto: CreateReferralPartnerDto) {
    return await this.referralPartnerService.create(dto);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateReferralPartnerDto) {
    return await this.referralPartnerService.update(id, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return await this.referralPartnerService.delete(id);
  }
}
