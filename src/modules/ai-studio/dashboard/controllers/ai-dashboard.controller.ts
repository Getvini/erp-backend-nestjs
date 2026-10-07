import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { AiDashboardService } from "../services/ai-dashboard.service";
import { QueryAiDashboardDto } from "../dto/ai-dashboard.dto";

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
    @Query() query: QueryAiDashboardDto,
  ) {
    const actor = req.user;
    return this.service.getDashboard(
      actor,
      query.userId,
      query.projectId,
      query.opportunityId,
      query.taskId,
      query.month,
      query.year,
    );
  }
}
