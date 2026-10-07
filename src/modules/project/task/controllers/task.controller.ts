import {
  Controller,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard";
import { TaskCreationService } from "../services/task-creation.service";
import { TaskStartService } from "../services/task-start.service";
import { TaskAssignmentService } from "../services/task-assignment.service";
import { TaskResultService } from "../services/task-result.service";
import { TaskSupportService } from "../services/task-support.service";
import { TaskDeletionService } from "../services/task-deletion.service";
import {
  CreateTaskDto,
  CreateInternalTaskDto,
  TaskAssignmentDto,
  BulkTaskAssignmentDto,
  BulkStartTasksDto,
  BulkUnassignTasksDto,
  UpdateTaskNicknameDto,
} from "../dto/task.dto";

@ApiTags("Project - Task")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tasks")
export class TaskController {
  constructor(
    private readonly creationService: TaskCreationService,
    private readonly startService: TaskStartService,
    private readonly assignmentService: TaskAssignmentService,
    private readonly resultService: TaskResultService,
    private readonly supportService: TaskSupportService,
    private readonly deletionService: TaskDeletionService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Tạo công việc dự án hoặc cơ hội" })
  async create(@Body() body: CreateTaskDto, @Request() req: any) {
    return this.creationService.create(body, req.user);
  }

  @Post("internal")
  @ApiOperation({ summary: "Tạo công việc nội bộ" })
  async createInternal(
    @Body() body: CreateInternalTaskDto,
    @Request() req: any,
  ) {
    return this.creationService.createInternalTask(body, req.user);
  }

  @Put("bulk-assign")
  @ApiOperation({ summary: "Phân công hàng loạt công việc" })
  async bulkAssign(@Body() body: BulkTaskAssignmentDto, @Request() req: any) {
    return this.assignmentService.bulkAssign(body.taskIds, body, req.user);
  }

  @Patch("bulk-unassign")
  @ApiOperation({ summary: "Hủy phân công hàng loạt công việc" })
  async bulkUnassign(@Body() body: BulkUnassignTasksDto, @Request() req: any) {
    return this.assignmentService.bulkUnassign(
      body.projectId,
      body.taskIds,
      req.user,
    );
  }

  @Patch("bulk-start")
  @ApiOperation({ summary: "Bắt đầu hàng loạt công việc" })
  async bulkStart(@Body() body: BulkStartTasksDto, @Request() req: any) {
    return this.startService.bulkStart(body.projectId, body.taskIds, req.user);
  }

  @Patch(":id/nickname")
  @ApiOperation({ summary: "Cập nhật nickname công việc" })
  async updateNickname(
    @Param("id") id: string,
    @Body() body: UpdateTaskNicknameDto,
    @Request() req: any,
  ) {
    return this.startService.updateNickname(id, body.nickname, req.user);
  }

  @Patch(":id/start")
  @ApiOperation({ summary: "Bắt đầu thực hiện công việc" })
  async start(@Param("id") id: string, @Request() req: any) {
    return this.startService.start(id, req.user);
  }

  @Put(":id")
  @ApiOperation({ summary: "Cập nhật thông tin công việc" })
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.startService.update(id, body, req.user);
  }

  @Put(":id/assign")
  @ApiOperation({ summary: "Phân công công việc" })
  async assign(
    @Param("id") id: string,
    @Body() body: TaskAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentService.assign(id, body, req.user);
  }

  @Patch(":id/submit-result")
  @ApiOperation({ summary: "Nộp kết quả công việc" })
  async submitResult(
    @Param("id") id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.resultService.submitResult(id, body, req.user);
  }

  @Patch(":id/submit-result-review")
  @ApiOperation({ summary: "Gửi duyệt kết quả đã lưu tạm" })
  async submitResultForReview(@Param("id") id: string, @Request() req: any) {
    return this.resultService.submitSavedResultForReview(id, req.user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa công việc hoặc subtask" })
  async delete(@Param("id") id: string) {
    return this.deletionService.delete(id);
  }

  @Patch(":id/reassign")
  @ApiOperation({ summary: "Chuyển giao lại người thực hiện" })
  async reassign(
    @Param("id") id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.assignmentService.reassign(id, body, req.user);
  }

  @Post(":id/pricing")
  @ApiOperation({ summary: "Định giá công việc phát sinh" })
  async assessExtraTask(@Param("id") id: string, @Body() body: any) {
    return this.deletionService.assessExtraTask(id, body);
  }

  @Post(":id/request-support")
  @ApiOperation({ summary: "Yêu cầu hỗ trợ thực hiện công việc" })
  async requestSupport(@Param("id") id: string, @Body("note") note: string) {
    return this.supportService.requestSupport(id, note);
  }

  @Patch(":id/rework")
  @ApiOperation({ summary: "Yêu cầu làm lại công việc" })
  async rework(
    @Param("id") id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.resultService.requestRework(id, body, req.user);
  }

  @Patch(":id/customer-approve")
  @ApiOperation({ summary: "Khách hàng duyệt kết quả demo" })
  async approveByCustomer(@Param("id") id: string, @Request() req: any) {
    return this.resultService.approveByCustomer(id, req.user);
  }

  @Patch(":id/customer-not-purchase")
  @ApiOperation({ summary: "Khách hàng không mua sau demo" })
  async customerDoesNotPurchase(@Param("id") id: string, @Request() req: any) {
    return this.resultService.customerDoesNotPurchase(id, req.user);
  }

  @Post(":id/remind")
  @ApiOperation({ summary: "Gửi nhắc nhở tiến độ công việc" })
  async sendReminder(@Param("id") id: string, @Request() req: any) {
    return this.supportService.sendReminder(id, req.user);
  }
}
