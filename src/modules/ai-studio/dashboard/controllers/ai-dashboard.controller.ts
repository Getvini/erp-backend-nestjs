import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { AiDashboardService } from "../services/ai-dashboard.service";

@ApiTags("AI Studio - Dashboard")
@ApiBearerAuth()
@Controller("ai-dashboard")
@UseGuards(JwtAuthGuard)
export class AiDashboardController {
  constructor(private readonly service: AiDashboardService) {}

  @Get()
  @ApiOperation({ summary: "Lấy dữ liệu thống kê tổng quan AI Dashboard" })
  async getDashboard(
    @Req() req: any,
    @Query("userId") userId?: string,
    @Query("projectId") projectId?: string,
    @Query("opportunityId") opportunityId?: string,
    @Query("taskId") taskId?: string,
    @Query("month") monthStr?: string,
    @Query("year") yearStr?: string,
  ) {
    const actor = req.user;
    const month = monthStr ? Number(monthStr) : undefined;
    const year = yearStr ? Number(yearStr) : undefined;

    return this.service.getDashboard(
      actor,
      userId,
      projectId,
      opportunityId,
      taskId,
      month,
      year,
    );
  }
}
