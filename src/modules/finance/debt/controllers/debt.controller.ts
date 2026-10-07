import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DebtService } from "../services/debt.service";
import { DebtPaymentService } from "../services/debt-payment.service";
import {
  ActivateDebtDto,
  UnlockDebtDto,
  CreateDebtPaymentDto,
} from "../dto/debt.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";
import { Roles } from "@core/decorators/roles.decorator";
import { RolesGuard } from "@core/guards/roles.guard";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@ApiTags("Finance - Debt")
@ApiBearerAuth()
@Controller("debts")
export class DebtController {
  constructor(
    private readonly debtService: DebtService,
    private readonly paymentService: DebtPaymentService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Danh sách công nợ (RBAC)" })
  getAll(@CurrentUser() user: any) {
    return this.debtService.getAll(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết một khoản công nợ" })
  getOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.debtService.getOne(id, user);
  }

  @Get("contract/:contractId")
  @ApiOperation({ summary: "Danh sách công nợ theo hợp đồng" })
  getByContract(
    @Param("contractId") contractId: string,
    @CurrentUser() user: any,
  ) {
    return this.debtService.getByContract(contractId, user);
  }

  @Post("activate")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Kích hoạt công nợ từ mốc thanh toán" })
  createFromMilestone(@Body() dto: ActivateDebtDto) {
    return this.debtService.createFromMilestone(dto.milestoneId);
  }

  @Post(":id/unlock")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN)
  @ApiOperation({ summary: "Mở khóa công nợ (BOD/ADMIN)" })
  unlockDebt(
    @Param("id") id: string,
    @Body() dto: UnlockDebtDto,
    @CurrentUser() user: any,
  ) {
    return this.debtService.unlockDebt(id, dto.reason, user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa khoản công nợ chưa phát sinh thanh toán" })
  delete(@Param("id") id: string) {
    return this.debtService.delete(id);
  }

  @Post("payments")
  @ApiOperation({ summary: "Ghi nhận thanh toán cho khoản nợ" })
  createPayment(@Body() dto: CreateDebtPaymentDto) {
    return this.paymentService.create(dto);
  }

  @Delete("payments/:id")
  @ApiOperation({ summary: "Xóa lượt thanh toán" })
  deletePayment(@Param("id") id: string) {
    return this.paymentService.delete(id);
  }
}
