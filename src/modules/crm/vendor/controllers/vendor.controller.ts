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
import { VendorService } from "@modules/crm/vendor/services/vendor.service";
import { CreateVendorDto, UpdateVendorDto } from "@modules/crm/vendor/dto/vendor.dto";

@ApiTags("CRM - Vendor")
@ApiBearerAuth()
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
    @Body("price") price?: number,
    @Body("costPrice") costPrice?: number,
    @Body("note") note?: string,
  ) {
    return await this.vendorService.addJob(
      vendorId,
      jobId,
      price ?? costPrice ?? 0,
      note,
    );
  }

  @Delete(":id/jobs/:jobId")
  async removeJob(
    @Param("id") vendorId: string,
    @Param("jobId") jobId: string,
  ) {
    return await this.vendorService.removeJob(vendorId, jobId);
  }
}
