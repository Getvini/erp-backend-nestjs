import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import { CustomerQueryService } from "@modules/crm/customer/services/customer-query.service";
import { CustomerActionService } from "@modules/crm/customer/services/customer-action.service";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
} from "@modules/crm/customer/dto/customer.dto";

@ApiTags("CRM - Customer")
@ApiBearerAuth()
@Controller("customers")
export class CustomerController {
  constructor(
    private readonly customerQueryService: CustomerQueryService,
    private readonly customerActionService: CustomerActionService,
  ) {}

  @Get()
  async getAll(@Query() query: CustomerQueryDto, @Req() req: any) {
    return await this.customerQueryService.getAll(query, req.user);
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @Req() req: any) {
    return await this.customerQueryService.getOne(id, req.user);
  }

  @Post()
  async create(@Body() dto: CreateCustomerDto, @Req() req: any) {
    return await this.customerActionService.create(dto, req.user);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
    @Req() req: any,
  ) {
    return await this.customerActionService.update(id, dto, req.user);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Req() req: any) {
    return await this.customerActionService.delete(id, req.user);
  }
}
