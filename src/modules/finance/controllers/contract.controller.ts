import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { ContractQueryService } from "@modules/finance/services/contract-query.service";
import { QueryContractDto } from "@modules/finance/dto/contract.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";

@ApiTags("Finance (Tài chính, Hợp đồng & Công nợ)")
@ApiBearerAuth()
@Controller("finance/contracts")
export class ContractController {
  constructor(private readonly queryService: ContractQueryService) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách hợp đồng" })
  @ApiResponse({ status: 200, description: "Danh sách hợp đồng" })
  async findAll(@Query() query: QueryContractDto, @CurrentUser() user: any) {
    return this.queryService.getAllContracts(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Xem chi tiết hợp đồng" })
  @ApiResponse({ status: 200, description: "Chi tiết hợp đồng" })
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.queryService.getContractById(id, user);
  }
}
