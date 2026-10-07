import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard";
import { TaskResultCheckService } from "../services/task-result-check.service";
import {
  ToggleCheckItemDto,
  ToggleBulkCheckDto,
} from "../dto/task-result-check.dto";

@ApiTags("Project - QC Task Result Check")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("task-result-checks")
export class TaskResultCheckController {
  constructor(private readonly checkService: TaskResultCheckService) {}

  @Get("task/:taskId")
  @ApiOperation({
    summary: "Lấy kết quả kiểm tra chính tả và QC của công việc",
  })
  async get(@Param("taskId") taskId: string, @Request() req: any) {
    return this.checkService.getForTask(taskId, req.user);
  }

  @Patch("task/:taskId/toggle")
  @ApiOperation({ summary: "Xác nhận hoặc bỏ qua một lỗi chính tả/QC" })
  async toggle(
    @Param("taskId") taskId: string,
    @Body() body: ToggleCheckItemDto,
    @Request() req: any,
  ) {
    return this.checkService.toggleItem(
      taskId,
      body.kind,
      body.id,
      body.confirmed,
      req.user,
    );
  }

  @Patch("task/:taskId/toggle-bulk")
  @ApiOperation({ summary: "Xác nhận hàng loạt lỗi chính tả/QC" })
  async toggleBulk(
    @Param("taskId") taskId: string,
    @Body() body: ToggleBulkCheckDto,
    @Request() req: any,
  ) {
    const results = [];
    for (const it of body.items || []) {
      results.push(
        await this.checkService.toggleItem(
          taskId,
          it.kind,
          it.id,
          it.confirmed,
          req.user,
        ),
      );
    }
    return results;
  }

  @Post("task/:taskId/finalize")
  @ApiOperation({ summary: "Chốt kết quả kiểm tra sau khi soát lỗi" })
  async finalize(@Param("taskId") taskId: string, @Request() req: any) {
    return this.checkService.finalize(taskId, req.user);
  }
}
