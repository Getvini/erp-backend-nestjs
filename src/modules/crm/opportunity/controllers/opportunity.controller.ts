import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import { OpportunityQueryService } from "../services/opportunity-query.service";
import { OpportunityLifecycleService } from "../services/opportunity-lifecycle.service";
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  OpportunityQueryDto,
  AddCustomerDto,
  RejectOpportunityDto,
} from "../dto/opportunity.dto";
import { Roles } from "../../../../core/decorators/roles.decorator";
import { UserRole } from "../../../identity/user/enums/user-role.enum";

@Controller("opportunities")
export class OpportunityController {
  constructor(
    private readonly queryService: OpportunityQueryService,
    private readonly lifecycleService: OpportunityLifecycleService,
  ) {}

  @Get()
  async getAll(@Query() query: OpportunityQueryDto, @Req() req: any) {
    return await this.queryService.getAll(query, req.user);
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @Req() req: any) {
    return await this.queryService.getOne(id, req.user);
  }

  @Post()
  async create(@Body() dto: CreateOpportunityDto, @Req() req: any) {
    return await this.lifecycleService.create(dto, req.user);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateOpportunityDto,
    @Req() req: any,
  ) {
    return await this.lifecycleService.update(id, dto, req.user);
  }

  @Patch(":id/draft")
  async saveDraft(
    @Param("id") id: string,
    @Body() dto: UpdateOpportunityDto,
    @Req() req: any,
  ) {
    return await this.lifecycleService.saveDraft(id, dto, req.user);
  }

  @Patch(":id/resubmit")
  async resubmit(@Param("id") id: string, @Req() req: any) {
    return await this.lifecycleService.resubmit(id, req.user);
  }

  @Patch(":id/addcustomer")
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.BD)
  async addCustomer(
    @Param("id") id: string,
    @Body() dto: AddCustomerDto,
    @Req() req: any,
  ) {
    return await this.lifecycleService.addCustomer(
      id,
      dto.customerId,
      req.user,
    );
  }

  @Patch(":id/approve")
  @Roles(UserRole.BOD, UserRole.ADMIN)
  async approve(@Param("id") id: string) {
    return await this.lifecycleService.approve(id);
  }

  @Patch(":id/reject")
  @Roles(UserRole.BOD, UserRole.ADMIN)
  async reject(
    @Param("id") id: string,
    @Body() dto: RejectOpportunityDto,
    @Req() req: any,
  ) {
    return await this.lifecycleService.reject(id, dto.reason, req.user);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return await this.lifecycleService.delete(id);
  }
}
