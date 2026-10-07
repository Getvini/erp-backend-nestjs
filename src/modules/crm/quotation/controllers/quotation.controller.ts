import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
} from "@nestjs/common";
import { QuotationQueryService } from "@modules/crm/quotation/services/quotation-query.service";
import { QuotationActionService } from "@modules/crm/quotation/services/quotation-action.service";
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  RejectQuotationDto,
} from "@modules/crm/quotation/dto/quotation.dto";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "@core/decorators/roles.decorator";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@ApiTags("CRM - Quotation")
@ApiBearerAuth()
@Controller("quotations")
export class QuotationController {
  constructor(
    private readonly queryService: QuotationQueryService,
    private readonly actionService: QuotationActionService,
  ) {}

  @Get()
  async getAll() {
    return await this.queryService.getAll();
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return await this.queryService.getOne(id);
  }

  @Get("opportunity/:opportunityId")
  async getByOpportunity(@Param("opportunityId") opportunityId: string) {
    return await this.queryService.getByOpportunity(opportunityId);
  }

  @Post()
  async create(@Body() dto: CreateQuotationDto, @Req() req: any) {
    return await this.actionService.create(dto, req.user);
  }

  @Post("addendum")
  async createAddendum(@Body() dto: CreateQuotationDto, @Req() req: any) {
    return await this.actionService.createAddendum(dto, req.user);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateQuotationDto) {
    return await this.actionService.update(id, dto);
  }

  @Post(":id/approve")
  @Roles(UserRole.BOD, UserRole.ADMIN)
  async approve(@Param("id") id: string) {
    return await this.actionService.approve(id);
  }

  @Post(":id/reject")
  async reject(@Param("id") id: string, @Body() dto: RejectQuotationDto) {
    return await this.actionService.reject(id, dto.reason);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return await this.actionService.delete(id);
  }
}
