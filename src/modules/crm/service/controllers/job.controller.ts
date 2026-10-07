import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JobService } from "@modules/crm/service/services/job.service";
import {
  CreateJobDto,
  UpdateJobDto,
  JobQueryDto,
} from "@modules/crm/service/dto/job.dto";

@ApiTags("CRM - Job")
@ApiBearerAuth()
@Controller("jobs")
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  async getAll(@Query() query: JobQueryDto) {
    return await this.jobService.getAll(query);
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return await this.jobService.getOne(id);
  }

  @Post()
  async create(@Body() dto: CreateJobDto) {
    return await this.jobService.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateJobDto) {
    return await this.jobService.update(id, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return await this.jobService.delete(id);
  }
}
