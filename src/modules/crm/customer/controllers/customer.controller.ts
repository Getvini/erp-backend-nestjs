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
import { CustomerQueryService } from "../services/customer-query.service";
import { CustomerActionService } from "../services/customer-action.service";
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
} from "../dto/customer.dto";

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
