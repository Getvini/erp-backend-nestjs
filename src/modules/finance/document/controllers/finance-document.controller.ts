import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FinanceDocumentService } from "../services/finance-document.service";
import { CreateFinanceDocumentDto } from "../dto/finance-document.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";

@ApiTags("Finance - Finance Document")
@ApiBearerAuth()
@Controller("finance-documents")
export class FinanceDocumentController {
  constructor(private readonly service: FinanceDocumentService) {}

  @Get("contracts/:contractId")
  @ApiOperation({
    summary: "Danh sách chứng từ nghiệm thu & hóa đơn VAT theo hợp đồng",
  })
  getByContract(
    @Param("contractId") contractId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getByContract(contractId, user);
  }

  @Post("acceptance-minutes")
  @ApiOperation({ summary: "Tạo biên bản nghiệm thu cho hợp đồng" })
  createAcceptanceMinute(
    @Body() dto: CreateFinanceDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createAcceptanceMinute(dto, user);
  }

  @Post("vat-invoices")
  @ApiOperation({ summary: "Tạo hóa đơn VAT cho hợp đồng" })
  createVatInvoice(
    @Body() dto: CreateFinanceDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createVatInvoice(dto, user);
  }
}
