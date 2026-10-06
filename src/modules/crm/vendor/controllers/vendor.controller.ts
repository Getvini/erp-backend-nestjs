import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { VendorService } from "../services/vendor.service";
import { CreateVendorDto, UpdateVendorDto } from "../dto/vendor.dto";

@Controller("vendors")
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  async getAll() {
    return await this.vendorService.getAll();
  }

  @Get("by-job/:jobId")
  async getByJob(@Param("jobId") jobId: string) {
    return await this.vendorService.getByJob(jobId);
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return await this.vendorService.getOne(id);
  }

  @Post()
  async create(@Body() dto: CreateVendorDto) {
    return await this.vendorService.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateVendorDto) {
    return await this.vendorService.update(id, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return await this.vendorService.delete(id);
  }

  @Post(":id/jobs/:jobId")
  async addJob(
    @Param("id") vendorId: string,
    @Param("jobId") jobId: string,
    @Body("costPrice") costPrice?: number,
  ) {
    return await this.vendorService.addJob(vendorId, jobId, costPrice);
  }

  @Delete(":id/jobs/:jobId")
  async removeJob(
    @Param("id") vendorId: string,
    @Param("jobId") jobId: string,
  ) {
    return await this.vendorService.removeJob(vendorId, jobId);
  }
}
