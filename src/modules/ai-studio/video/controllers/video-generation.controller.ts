import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { VideoGenerationService } from "../services/video-generation.service";
import { MotionGenerationService } from "../services/motion-generation.service";
import { GenerationBudgetService } from "../services/generation-budget.service";
import {
  CreateVideoDto,
  CreateMotionControlVideoDto,
} from "../dto/video-generation.dto";

@ApiTags("AI Studio - Video Generation")
@ApiBearerAuth()
@Controller("video-generations")
@UseGuards(JwtAuthGuard)
export class VideoGenerationController {
  constructor(
    private readonly videoService: VideoGenerationService,
    private readonly motionService: MotionGenerationService,
    private readonly budgetService: GenerationBudgetService,
  ) {}

  @Get("tasks/:taskId/budget")
  @ApiOperation({ summary: "Kiểm tra ngân sách AI còn lại cho task" })
  async getTaskBudget(@Req() req: any, @Param("taskId") taskId: string) {
    return this.budgetService.getSnapshot(taskId, req.user.id);
  }

  @Post("create")
  @ApiOperation({ summary: "Khởi tạo tác vụ sinh video AI từ ảnh/prompt" })
  async createVideo(@Req() req: any, @Body() body: CreateVideoDto) {
    return this.videoService.createVideo(req.user.id, body);
  }

  @Get("history")
  @ApiOperation({ summary: "Lấy lịch sử sinh video của user" })
  async getVideoHistory(
    @Req() req: any,
    @Query("projectId") projectId?: string,
  ) {
    return this.videoService.getHistory(req.user.id, projectId);
  }

  @Get(":id/status")
  @ApiOperation({ summary: "Lấy trạng thái chi tiết của tác vụ sinh video" })
  async getVideoStatus(@Param("id") id: string) {
    return this.videoService.getStatus(Number(id));
  }

  @Post("create-motion-control")
  @ApiOperation({ summary: "Khởi tạo tác vụ Motion Control video AI" })
  async createMotionControl(
    @Req() req: any,
    @Body() body: CreateMotionControlVideoDto,
  ) {
    return this.motionService.createMotionControlVideo(req.user.id, body);
  }

  @Get("motion-control/history")
  @ApiOperation({ summary: "Lấy lịch sử sinh Motion Control video của user" })
  async getMotionHistory(
    @Req() req: any,
    @Query("projectId") projectId?: string,
  ) {
    return this.motionService.getHistory(req.user.id, projectId);
  }

  @Get("motion-control/:id/status")
  @ApiOperation({
    summary: "Lấy trạng thái chi tiết của tác vụ Motion Control",
  })
  async getMotionStatus(@Param("id") id: string) {
    return this.motionService.getStatus(Number(id));
  }
}
