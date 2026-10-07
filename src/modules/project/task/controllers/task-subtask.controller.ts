import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { TaskDelegationService } from "@modules/project/task/services/task-delegation.service";
import {
  CreateSubtaskDto,
  RespondSubtaskPlanDto,
  RequestTaskStaffingDto,
  RespondTaskStaffingDto,
} from "@modules/project/task/dto/task-subtask.dto";

@ApiTags("Project - Task Subtask")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tasks")
export class TaskSubtaskController {
  constructor(private readonly delegationService: TaskDelegationService) {}

  @Post(":id/request-staffing")
  @ApiOperation({ summary: "Yêu cầu bổ sung nhân sự" })
  async requestStaffing(
    @Param("id") id: string,
    @Body() body: RequestTaskStaffingDto,
    @Request() req: any,
  ) {
    return this.delegationService.requestStaffing(id, body.note, req.user);
  }

  @Patch(":id/respond-staffing")
  @ApiOperation({ summary: "Phản hồi yêu cầu nhân sự" })
  async respondStaffingRequest(
    @Param("id") id: string,
    @Body() body: RespondTaskStaffingDto,
    @Request() req: any,
  ) {
    return this.delegationService.respondStaffingRequest(id, body.action, req.user);
  }

  @Post(":id/subtasks")
  @ApiOperation({ summary: "Tạo subtask con" })
  async createSubtask(
    @Param("id") id: string,
    @Body() body: CreateSubtaskDto,
    @Request() req: any,
  ) {
    return this.delegationService.createSubtask(id, body, req.user);
  }

  @Patch(":id/subtask")
  @ApiOperation({ summary: "Cập nhật subtask" })
  async updateSubtask(
    @Param("id") id: string,
    @Body() body: CreateSubtaskDto,
    @Request() req: any,
  ) {
    return this.delegationService.updateSubtask(id, body, req.user);
  }

  @Post(":id/subtask-plan/submit")
  @ApiOperation({ summary: "Gửi duyệt phương án phân bổ subtask" })
  async submitSubtaskPlan(@Param("id") id: string, @Request() req: any) {
    return this.delegationService.submitSubtaskPlan(id, req.user);
  }

  @Patch(":id/subtask-plan/respond")
  @ApiOperation({ summary: "Duyệt hoặc từ chối phương án subtask" })
  async respondSubtaskPlan(
    @Param("id") id: string,
    @Body() body: RespondSubtaskPlanDto,
    @Request() req: any,
  ) {
    return this.delegationService.respondSubtaskPlan(
      id,
      body.action,
      body.note,
      req.user,
    );
  }
}
