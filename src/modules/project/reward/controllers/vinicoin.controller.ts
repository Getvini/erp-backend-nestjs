import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../core/guards/roles.guard";
import { Roles } from "../../../../core/decorators/roles.decorator";
import { UserRole } from "../../../identity/user/enums/user-role.enum";
import { VinicoinService } from "../services/vinicoin.service";
import {
  VinicoinQueryDto,
  ManualVinicoinAdjustmentDto,
} from "../dto/vinicoin.dto";

@ApiTags("Project - Reward (Vinicoin)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("vinicoin")
export class VinicoinController {
  constructor(private readonly vinicoinService: VinicoinService) {}

  @Get("balance")
  @ApiOperation({ summary: "Xem số dư Vinicoin của tài khoản hiện tại" })
  async getMyBalance(@Request() req: any) {
    const accountId = req.user?.id || req.user?.userId;
    return this.vinicoinService.getBalance(accountId);
  }

  @Get("history")
  @ApiOperation({
    summary: "Lịch sử biến động Vinicoin của tài khoản hiện tại",
  })
  async getMyHistory(@Query() query: VinicoinQueryDto, @Request() req: any) {
    const accountId = req.user?.id || req.user?.userId;
    return this.vinicoinService.getHistory(accountId, query);
  }

  @Get("accounts/:accountId/history")
  @Roles(UserRole.BOD, UserRole.ADMIN, "BOD", "ADMIN")
  @ApiOperation({
    summary: "Xem lịch sử Vinicoin của một tài khoản bất kỳ (BOD/ADMIN)",
  })
  async getAccountHistory(
    @Param("accountId") accountId: string,
    @Query() query: VinicoinQueryDto,
  ) {
    return this.vinicoinService.getHistory(accountId, query);
  }

  @Post("adjust")
  @Roles(UserRole.BOD, UserRole.ADMIN, "BOD", "ADMIN")
  @ApiOperation({ summary: "Điều chỉnh Vinicoin thủ công (BOD/ADMIN)" })
  async adjustVinicoin(@Body() body: ManualVinicoinAdjustmentDto) {
    return this.vinicoinService.adjustVinicoin(body);
  }
}
