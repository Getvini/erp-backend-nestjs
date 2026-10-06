import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { ServicePackageService } from "../services/service-package.service";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  CreateServicePackageDto,
  UpdateServicePackageDto,
} from "../dto/service-package.dto";

@ApiTags("CRM - Service Package")
@ApiBearerAuth()
@Controller("service-packages")
export class ServicePackageController {
  constructor(private readonly packageService: ServicePackageService) {}

  @Get()
  async getAll() {
    return await this.packageService.getAll();
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return await this.packageService.getOne(id);
  }

  @Post()
  async create(@Body() dto: CreateServicePackageDto) {
    return await this.packageService.create(dto);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateServicePackageDto) {
    return await this.packageService.update(id, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return await this.packageService.delete(id);
  }
}
