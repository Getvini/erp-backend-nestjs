import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard";
import { TaskReviewService } from "../services/task-review.service";
import { TaskReviewFinalizeService } from "../services/task-review-finalize.service";
import {
  ToggleCriteriaDto,
  FinalizeReviewDto,
  RejectReviewDto,
} from "../dto/task-review.dto";

@ApiTags("Project - QC Task Review")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("task-reviews")
export class TaskReviewController {
  constructor(
    private readonly reviewService: TaskReviewService,
    private readonly finalizeService: TaskReviewFinalizeService,
  ) {}

  @Get("task/:taskId")
  @ApiOperation({ summary: "Lấy danh sách đánh giá tiêu chí của công việc" })
  async getTaskReviews(@Param("taskId") taskId: string) {
    return this.reviewService.getTaskReviews(taskId);
  }

  @Put(":id/toggle")
  @ApiOperation({ summary: "Đánh giá đạt/không đạt tiêu chí" })
  async toggleCriteria(
    @Param("id") id: string,
    @Body() body: ToggleCriteriaDto,
    @Request() req: any,
  ) {
    return this.reviewService.toggleCriteria(
      id,
      body.isPassed,
      body.note,
      req.user,
    );
  }

  @Post("task/:taskId/finalize")
  @ApiOperation({ summary: "Chốt hoàn tất duyệt kết quả công việc" })
  async finalize(
    @Param("taskId") taskId: string,
    @Body() body: FinalizeReviewDto,
    @Request() req: any,
  ) {
    return this.finalizeService.checkAndFinalize(
      taskId,
      body.passedCriteriaIds,
      body.reviewNote,
      req.user,
    );
  }

  @Post("task/:taskId/reject")
  @ApiOperation({ summary: "Từ chối kết quả công việc, yêu cầu làm lại" })
  async reject(
    @Param("taskId") taskId: string,
    @Body() body: RejectReviewDto,
    @Request() req: any,
  ) {
    return this.reviewService.reject(taskId, body.note, req.user);
  }
}
