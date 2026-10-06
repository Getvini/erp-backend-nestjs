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
import { ServiceService } from "../services/service.service";
import {
  CreateServiceDto,
  UpdateServiceDto,
  BulkDeleteServicesDto,
} from "../dto/service.dto";

@Controller("services")
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  async getAll(@Query() query: any) {
    return await this.serviceService.getAll(query);
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return await this.serviceService.getOne(id);
  }

  @Post()
  async create(@Body() dto: CreateServiceDto) {
    return await this.serviceService.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateServiceDto) {
    return await this.serviceService.update(id, dto);
  }

  @Delete("bulk")
  async bulkDelete(@Body() dto: BulkDeleteServicesDto) {
    return await this.serviceService.bulkDelete(dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return await this.serviceService.delete(id);
  }

  @Post(":id/jobs/:jobId")
  async addJob(@Param("id") serviceId: string, @Param("jobId") jobId: string) {
    return await this.serviceService.addJob(serviceId, jobId);
  }

  @Delete(":id/jobs/:jobId")
  async removeJob(
    @Param("id") serviceId: string,
    @Param("jobId") jobId: string,
  ) {
    return await this.serviceService.removeJob(serviceId, jobId);
  }
}
