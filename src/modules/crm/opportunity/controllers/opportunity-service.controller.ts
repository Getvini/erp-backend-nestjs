import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { OpportunityServiceService } from "../services/opportunity-service.service";
import {
  CreateOppServiceDto,
  UpdateOppServiceDto,
} from "../dto/opportunity-service.dto";

@ApiTags("CRM - Opportunity")
@ApiBearerAuth()
@Controller("opportunity-services")
export class OpportunityServiceController {
  constructor(private readonly oppServiceService: OpportunityServiceService) {}

  @Get("opportunity/:opportunityId")
  async getAllByOpportunity(@Param("opportunityId") opportunityId: string) {
    return await this.oppServiceService.getAllByOpportunity(opportunityId);
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return await this.oppServiceService.getOne(id);
  }

  @Post()
  async create(@Body() dto: CreateOppServiceDto) {
    return await this.oppServiceService.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateOppServiceDto) {
    return await this.oppServiceService.update(id, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return await this.oppServiceService.delete(id);
  }
}
