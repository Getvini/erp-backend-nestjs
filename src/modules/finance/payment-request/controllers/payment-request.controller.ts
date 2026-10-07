import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentRequestQueryService } from "../services/payment-request-query.service";
import { PaymentRequestActionService } from "../services/payment-request-action.service";
import { PaymentRequestWorkflowService } from "../services/payment-request-workflow.service";
import {
  CreatePaymentRequestDto,
  UpdatePaymentRequestDto,
  SupplementPaymentRequestDto,
  ReviewPaymentRequestDto,
  BodDecisionDto,
  PayPaymentRequestDto,
  CancelPaymentRequestDto,
  QueryPaymentRequestDto,
  AttachmentFileDto,
} from "../dto/payment-request.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";
import { Roles } from "@core/decorators/roles.decorator";
import { RolesGuard } from "@core/guards/roles.guard";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@ApiTags("Finance - Payment Request")
@ApiBearerAuth()
@Controller("payment-requests")
export class PaymentRequestController {
  constructor(
    private readonly queryService: PaymentRequestQueryService,
    private readonly actionService: PaymentRequestActionService,
    private readonly workflowService: PaymentRequestWorkflowService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Danh sách yêu cầu thanh toán (lọc & phân quyền)" })
  getAll(@Query() query: QueryPaymentRequestDto, @CurrentUser() user: any) {
    return this.queryService.getAll(query, user);
  }

  @Get("total-debt")
  @ApiOperation({ summary: "Tổng hợp công nợ cần chi theo bộ lọc" })
  getTotalDebt(
    @Query() query: QueryPaymentRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.queryService.getTotalDebt(query, user);
  }

  @Get("task/:taskId/spent")
  @ApiOperation({ summary: "Tra cứu chi phí đã chi của một task" })
  getTaskSpent(@Param("taskId") taskId: string) {
    return this.queryService.getTaskSpent(taskId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết yêu cầu thanh toán" })
  getOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.queryService.getOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: "Tạo yêu cầu thanh toán mới" })
  create(@Body() dto: CreatePaymentRequestDto, @CurrentUser() user: any) {
    const requesterId = user?.userId || user?.id;
    return this.actionService.create(dto, requesterId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật yêu cầu thanh toán" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePaymentRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.actionService.update(id, dto, user);
  }

  @Patch(":id/supplement")
  @ApiOperation({ summary: "Người tạo bổ sung hồ sơ chứng từ" })
  supplement(
    @Param("id") id: string,
    @Body() dto: SupplementPaymentRequestDto,
    @CurrentUser() user: any,
  ) {
    const requesterId = user?.userId || user?.id;
    return this.actionService.supplement(id, dto, requesterId);
  }

  @Post(":id/submit")
  @ApiOperation({ summary: "Gửi duyệt yêu cầu thanh toán" })
  submit(@Param("id") id: string, @CurrentUser() user: any) {
    const requesterId = user?.userId || user?.id;
    return this.actionService.submit(id, requesterId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa yêu cầu thanh toán nháp" })
  delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.actionService.delete(id, user);
  }

  @Post(":id/invoice-pdfs")
  @ApiOperation({ summary: "Đính kèm thêm hóa đơn PDF" })
  addInvoicePdf(
    @Param("id") id: string,
    @Body() file: AttachmentFileDto,
    @CurrentUser() user: any,
  ) {
    return this.actionService.addInvoicePdf(id, file, user);
  }

  @Post(":id/review")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN_SALE, UserRole.BOD, UserRole.ADMIN)
  @ApiOperation({ summary: "Admin Sale duyệt vòng 1" })
  review(
    @Param("id") id: string,
    @Body() dto: ReviewPaymentRequestDto,
    @CurrentUser() user: any,
  ) {
    const reviewerId = user?.userId || user?.id;
    return this.workflowService.review(id, dto, reviewerId, user?.role);
  }

  @Post(":id/bod-decision")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN)
  @ApiOperation({ summary: "BOD phê duyệt hoặc yêu cầu bổ sung" })
  bodDecision(
    @Param("id") id: string,
    @Body() dto: BodDecisionDto,
    @CurrentUser() user: any,
  ) {
    const bodUserId = user?.userId || user?.id;
    return this.workflowService.bodDecision(id, dto, bodUserId);
  }

  @Post(":id/pay")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Kế toán/Thủ quỹ thực hiện chi tiền" })
  pay(
    @Param("id") id: string,
    @Body() dto: PayPaymentRequestDto,
    @CurrentUser() user: any,
  ) {
    const payerId = user?.userId || user?.id;
    return this.workflowService.pay(id, dto, payerId);
  }

  @Post(":id/payment-proofs")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Đính kèm chứng từ thanh toán" })
  uploadPaymentProof(@Param("id") id: string, @Body() file: AttachmentFileDto) {
    return this.workflowService.uploadPaymentProof(id, file);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Hủy yêu cầu thanh toán" })
  cancel(
    @Param("id") id: string,
    @Body() dto: CancelPaymentRequestDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId || user?.id;
    return this.workflowService.cancel(id, actorId, user?.role, dto.reason);
  }
}
