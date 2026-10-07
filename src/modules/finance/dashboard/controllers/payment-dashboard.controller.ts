import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentDashboardService } from "../services/payment-dashboard.service";
import { PaymentDashboardQueryDto } from "../dto/payment-dashboard.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";

@ApiTags("Finance - Payment Dashboard")
@ApiBearerAuth()
@Controller("payment-dashboard")
export class PaymentDashboardController {
  constructor(private readonly service: PaymentDashboardService) {}

  @Get()
  @ApiOperation({ summary: "Báo cáo tổng quan tiến độ thu tiền và tài chính" })
  getDashboard(
    @Query() query: PaymentDashboardQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.service.getDashboard(query, user);
  }
}
