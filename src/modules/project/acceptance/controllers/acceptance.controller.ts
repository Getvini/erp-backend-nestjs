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
import { AcceptanceService } from "../services/acceptance.service";
import {
  CreateAcceptanceDto,
  ApproveAcceptanceDto,
  RejectAcceptanceDto,
  ProcessAcceptanceDto,
  AcceptanceQueryDto,
} from "../dto/acceptance.dto";

@ApiTags("Project - Acceptance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("acceptance")
export class AcceptanceController {
  constructor(private readonly acceptanceService: AcceptanceService) {}

  @Get()
  @ApiOperation({
    summary: "Danh sách các yêu cầu nghiệm thu (có phân trang & lọc)",
  })
  async getAllRequests(@Query() query: AcceptanceQueryDto) {
    return this.acceptanceService.getAllRequests(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết một yêu cầu nghiệm thu" })
  async getRequest(@Param("id") id: string) {
    return this.acceptanceService.getRequest(id);
  }

  @Post("request")
  @ApiOperation({ summary: "Tạo yêu cầu nghiệm thu đợt mới" })
  async createRequest(@Body() body: CreateAcceptanceDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    return this.acceptanceService.createRequest({
      ...body,
      userId,
    });
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Duyệt toàn bộ yêu cầu nghiệm thu" })
  async approveRequest(
    @Param("id") id: string,
    @Body() body: ApproveAcceptanceDto,
    @Request() req: any,
  ) {
    return this.acceptanceService.approveRequest(id, req.user, body.feedback);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Từ chối yêu cầu nghiệm thu" })
  async rejectRequest(
    @Param("id") id: string,
    @Body() body: RejectAcceptanceDto,
    @Request() req: any,
  ) {
    return this.acceptanceService.rejectRequest(id, req.user, body.feedback);
  }

  @Post(":id/process")
  @ApiOperation({ summary: "Xử lý chi tiết kết quả từng dịch vụ/task" })
  async processRequest(
    @Param("id") id: string,
    @Body() body: ProcessAcceptanceDto,
    @Request() req: any,
  ) {
    return this.acceptanceService.processRequest(id, req.user, body.decisions);
  }
}
