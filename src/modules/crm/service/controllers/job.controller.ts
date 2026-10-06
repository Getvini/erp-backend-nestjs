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
import { JobService } from "../services/job.service";
import { CreateJobDto, UpdateJobDto } from "../dto/job.dto";

@Controller("jobs")
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  async getAll(
    @Query("name") name?: string,
    @Query("category") category?: string,
  ) {
    return await this.jobService.getAll({ name, category });
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
