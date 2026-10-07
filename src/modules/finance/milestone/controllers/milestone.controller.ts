import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentMilestoneService } from "../services/milestone.service";
import {
  CreatePaymentMilestonesDto,
  UpdateMilestoneDto,
  BulkSaveMilestonesDto,
} from "../dto/milestone.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";

@ApiTags("Finance - Payment Milestone")
@ApiBearerAuth()
@Controller("payment-milestones")
export class PaymentMilestoneController {
  constructor(private readonly milestoneService: PaymentMilestoneService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách tất cả đợt thanh toán" })
  getAll(@CurrentUser() user: any) {
    return this.milestoneService.getAll(user);
  }

  @Get("contract/:contractId")
  @ApiOperation({ summary: "Danh sách đợt thanh toán theo hợp đồng" })
  getByContract(
    @Param("contractId") contractId: string,
    @CurrentUser() user: any,
  ) {
    return this.milestoneService.getByContract(contractId, user);
  }

  @Post()
  @ApiOperation({ summary: "Tạo các đợt thanh toán cho hợp đồng" })
  create(@Body() dto: CreatePaymentMilestonesDto) {
    return this.milestoneService.create(dto.contractId, dto.milestones);
  }

  @Put(":id")
  @ApiOperation({ summary: "Cập nhật một đợt thanh toán" })
  update(@Param("id") id: string, @Body() dto: UpdateMilestoneDto) {
    return this.milestoneService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa một đợt thanh toán" })
  delete(@Param("id") id: string) {
    return this.milestoneService.delete(id);
  }

  @Put("contract/:contractId/bulk")
  @ApiOperation({ summary: "Cập nhật hàng loạt đợt thanh toán của hợp đồng" })
  bulkSave(
    @Param("contractId") contractId: string,
    @Body() dto: BulkSaveMilestonesDto,
  ) {
    return this.milestoneService.bulkSave(contractId, dto.milestones);
  }
}
