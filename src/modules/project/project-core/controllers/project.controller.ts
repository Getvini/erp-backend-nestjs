import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ProjectQueryService } from "../services/project-query.service";
import { ProjectLifecycleService } from "../services/project-lifecycle.service";
import { ProjectPauseService } from "../services/project-pause.service";
import { ProjectCloseService } from "../services/project-close.service";
import {
  QueryProjectDto,
  UpdateProjectDto,
  AssignTeamDto,
  PauseProjectDto,
  RejectPauseDto,
  ResumeProjectDto,
  CloseProjectDto,
  CloseProjectDirectDto,
  RejectCloseDto,
  UpdateProjectStatusDto,
  UpdateWorkingFilesDto,
} from "../dto/project.dto";
import { CurrentUser } from "../../../../core/decorators/current-user.decorator";

@ApiTags("Project - Core")
@ApiBearerAuth()
@Controller("projects")
export class ProjectController {
  constructor(
    private readonly queryService: ProjectQueryService,
    private readonly lifecycleService: ProjectLifecycleService,
    private readonly pauseService: ProjectPauseService,
    private readonly closeService: ProjectCloseService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách dự án" })
  async getAll(@Query() query: QueryProjectDto, @CurrentUser() user: any) {
    return await this.queryService.getAll(query, user);
  }

  @Get("my-projects")
  @ApiOperation({ summary: "Lấy dự án của tôi" })
  async getMyProjects(@CurrentUser() user: any) {
    return await this.queryService.getMyProjects(user);
  }

  @Get("contract/:contractId")
  @ApiOperation({ summary: "Lấy dự án theo hợp đồng" })
  async getByContract(
    @Param("contractId") contractId: string,
    @CurrentUser() user: any,
  ) {
    return await this.queryService.getByContractId(contractId, user);
  }

  @Post("assign")
  @ApiOperation({ summary: "Phân công PM cho dự án" })
  async assign(@Body() dto: AssignTeamDto, @CurrentUser() user: any) {
    return await this.lifecycleService.assign(dto, user);
  }

  @Post("pause-requests/:requestId/approve")
  @ApiOperation({ summary: "Duyệt yêu cầu tạm dừng" })
  async approvePause(
    @Param("requestId") requestId: string,
    @CurrentUser() user: any,
  ) {
    return await this.pauseService.approvePause(requestId, user);
  }

  @Post("pause-requests/:requestId/reject")
  @ApiOperation({ summary: "Từ chối yêu cầu tạm dừng" })
  async rejectPause(
    @Param("requestId") requestId: string,
    @Body() dto: RejectPauseDto,
    @CurrentUser() user: any,
  ) {
    return await this.pauseService.rejectPause(requestId, dto.feedback, user);
  }

  @Post("close-requests/:requestId/approve")
  @ApiOperation({ summary: "Duyệt yêu cầu đóng dự án" })
  async approveClose(
    @Param("requestId") requestId: string,
    @CurrentUser() user: any,
  ) {
    return await this.closeService.approveClose(requestId, user);
  }

  @Post("close-requests/:requestId/reject")
  @ApiOperation({ summary: "Từ chối yêu cầu đóng dự án" })
  async rejectClose(
    @Param("requestId") requestId: string,
    @Body() dto: RejectCloseDto,
    @CurrentUser() user: any,
  ) {
    return await this.closeService.rejectClose(requestId, dto.feedback, user);
  }

  @Post(":id/confirm")
  @ApiOperation({ summary: "PM xác nhận tiếp nhận dự án" })
  async confirm(@Param("id") id: string, @CurrentUser() user: any) {
    return await this.lifecycleService.confirm(id, user);
  }

  @Put(":id")
  @ApiOperation({ summary: "Cập nhật dự án" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    return await this.lifecycleService.update(id, dto, user);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Cập nhật trạng thái dự án" })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateProjectStatusDto,
    @CurrentUser() user: any,
  ) {
    return await this.lifecycleService.updateStatus(id, dto.status, user);
  }

  @Patch(":id/working-files")
  @ApiOperation({ summary: "Cập nhật tài liệu làm việc" })
  async updateWorkingFiles(
    @Param("id") id: string,
    @Body() dto: UpdateWorkingFilesDto,
    @CurrentUser() user: any,
  ) {
    return await this.lifecycleService.updateWorkingFiles(
      id,
      dto.workingFiles,
      user,
    );
  }

  @Post(":id/pause")
  @ApiOperation({ summary: "Yêu cầu tạm dừng dự án" })
  async requestPause(
    @Param("id") id: string,
    @Body() dto: PauseProjectDto,
    @CurrentUser() user: any,
  ) {
    return await this.pauseService.requestPause(id, dto.reason, user);
  }

  @Post(":id/pause/direct")
  @ApiOperation({ summary: "BOD/ADMIN tạm dừng trực tiếp" })
  async pauseDirect(
    @Param("id") id: string,
    @Body() dto: PauseProjectDto,
    @CurrentUser() user: any,
  ) {
    return await this.pauseService.pauseDirect(id, dto.reason, user);
  }

  @Post(":id/resume")
  @ApiOperation({ summary: "Tiếp tục thực hiện dự án" })
  async resume(
    @Param("id") id: string,
    @Body() dto: ResumeProjectDto,
    @CurrentUser() user: any,
  ) {
    return await this.pauseService.resume(id, dto.resumeReason, user);
  }

  @Get(":id/pause-history")
  @ApiOperation({ summary: "Lịch sử tạm dừng" })
  async getPauseHistory(@Param("id") id: string) {
    return await this.pauseService.getPauseHistory(id);
  }

  @Get(":id/hold-summary")
  @ApiOperation({ summary: "Tóm tắt trạng thái tạm dừng" })
  async getHoldSummary(@Param("id") id: string) {
    return await this.closeService.getHoldSummary(id);
  }

  @Post(":id/close")
  @ApiOperation({ summary: "Đề nghị đóng dự án" })
  async requestClose(
    @Param("id") id: string,
    @Body() dto: CloseProjectDto,
    @CurrentUser() user: any,
  ) {
    return await this.closeService.requestClose(id, dto.reason, user);
  }

  @Post(":id/close/direct")
  @ApiOperation({ summary: "Đóng dự án trực tiếp" })
  async closeDirect(
    @Param("id") id: string,
    @Body() dto: CloseProjectDirectDto,
    @CurrentUser() user: any,
  ) {
    return await this.closeService.closeDirect(id, dto.reason, user);
  }

  @Post(":id/request-staffing")
  @ApiOperation({ summary: "Yêu cầu nhân sự" })
  async requestStaffing(
    @Param("id") id: string,
    @Body("note") note: string,
    @CurrentUser() user: any,
  ) {
    return await this.lifecycleService.requestStaffing(id, note, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết dự án" })
  async getOne(@Param("id") id: string, @CurrentUser() user: any) {
    return await this.queryService.getOne(id, user);
  }
}
