import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { DashboardService } from "@modules/project/dashboard/services/dashboard.service";
import { DashboardQueryDto } from "@modules/project/dashboard/dto/dashboard.dto";

@ApiTags("Project - Dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: "Lấy dữ liệu tổng quan Dashboard" })
  async getDashboardData(
    @Query() query: DashboardQueryDto,
    @Request() req: any,
  ) {
    const userInfo = req.user;
    if (!userInfo) {
      throw new UnauthorizedException(
        "Không xác định được danh tính người dùng",
      );
    }

    return this.dashboardService.getDashboardData(
      userInfo,
      query.userId,
      query.month,
      query.year,
      query.projectId,
      query.mode,
      query.startMonth,
      query.endMonth,
    );
  }
}
