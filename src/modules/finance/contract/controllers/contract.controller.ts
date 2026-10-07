import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Put,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ContractQueryService } from "@modules/finance/contract/services/contract-query.service";
import { ContractActionService } from "@modules/finance/contract/services/contract-action.service";
import { MilestoneService } from "@modules/finance/contract/services/milestone.service";
import {
  CreateContractDto,
  ContractQueryDto,
  RejectProposalDto,
  UploadProposalDto,
  UploadSignedContractDto,
  UpdateContractServiceNicknameDto,
  AddMilestoneDto,
  UpdateMilestoneDto,
} from "@modules/finance/contract/dto/contract.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";
import { UseGuards } from "@nestjs/common";
import { RolesGuard } from "@core/guards/roles.guard";
import { Roles } from "@core/decorators/roles.decorator";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@ApiTags("Finance - Contract")
@ApiBearerAuth()
@Controller("contracts")
export class ContractController {
  constructor(
    private readonly queryService: ContractQueryService,
    private readonly actionService: ContractActionService,
    private readonly milestoneService: MilestoneService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Danh sách hợp đồng (RBAC)" })
  getAll(@Query() query: ContractQueryDto, @CurrentUser() user: any) {
    return this.queryService.getAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết hợp đồng" })
  getOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.queryService.getOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: "Tạo hợp đồng mới" })
  create(@Body() dto: CreateContractDto, @CurrentUser() user: any) {
    return this.actionService.create(dto, user);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Xóa hợp đồng" })
  delete(@Param("id") id: string) {
    return this.actionService.delete(id);
  }

  @Patch("services/:id/nickname")
  @ApiOperation({ summary: "Cập nhật nickname hạng mục dịch vụ" })
  updateNickname(
    @Param("id") id: string,
    @Body() dto: UpdateContractServiceNicknameDto,
    @CurrentUser() user: any,
  ) {
    return this.actionService.updateServiceNickname(
      id,
      dto.nickname ?? null,
      user,
    );
  }

  // Proposal workflow
  @Post(":id/proposal")
  @ApiOperation({ summary: "Upload file hợp đồng đề xuất" })
  uploadProposal(@Param("id") id: string, @Body() dto: UploadProposalDto) {
    const url = dto.file?.url || dto.contractLink?.trim();
    if (!url)
      throw Object.assign(new Error("Vui lòng tải file hoặc nhập link"), {
        statusCode: 400,
      });
    return this.actionService.uploadProposal(id, url, dto.quotationLink);
  }

  @Post(":id/approve-proposal")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Duyệt hợp đồng đề xuất" })
  approveProposal(@Param("id") id: string) {
    return this.actionService.approveProposal(id);
  }

  @Post(":id/reject-proposal")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Từ chối hợp đồng đề xuất" })
  rejectProposal(@Param("id") id: string, @Body() dto: RejectProposalDto) {
    return this.actionService.rejectProposal(id, dto.reason);
  }

  @Post(":id/signed")
  @ApiOperation({ summary: "Upload bản hợp đồng đã ký" })
  uploadSigned(@Param("id") id: string, @Body() body: UploadSignedContractDto) {
    if (!body.file?.url)
      throw Object.assign(new Error("Không tìm thấy file metadata"), {
        statusCode: 400,
      });
    return this.actionService.uploadSigned(id, body.file.url);
  }

  // Milestones
  @Post(":id/milestones")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Thêm đợt thanh toán" })
  addMilestone(@Param("id") contractId: string, @Body() dto: AddMilestoneDto) {
    return this.milestoneService.create(contractId, dto);
  }

  @Put("milestones/:id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Cập nhật đợt thanh toán" })
  updateMilestone(@Param("id") id: string, @Body() dto: UpdateMilestoneDto) {
    return this.milestoneService.update(id, dto);
  }

  @Delete("milestones/:id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Xóa đợt thanh toán" })
  deleteMilestone(@Param("id") id: string) {
    return this.milestoneService.delete(id);
  }
}
