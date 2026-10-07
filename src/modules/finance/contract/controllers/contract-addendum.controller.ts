import { Controller, Post, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ContractAddendumService } from "../services/contract-addendum.service";
import {
  CreateContractAddendumDto,
  AddAddendumItemsDto,
  UploadSignedAddendumDto,
  ScaleDownAddendumDto,
  AddendumReviewDto,
  ResubmitAddendumDto,
} from "../dto/contract-addendum.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";
import { Roles } from "@core/decorators/roles.decorator";
import { RolesGuard } from "@core/guards/roles.guard";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@ApiTags("Finance - Contract Addendum")
@ApiBearerAuth()
@Controller("contract-addendums")
export class ContractAddendumController {
  constructor(private readonly service: ContractAddendumService) {}

  @Post()
  @ApiOperation({ summary: "Tạo phụ lục hợp đồng mới" })
  create(@Body() dto: CreateContractAddendumDto) {
    return this.service.create(dto);
  }

  @Post(":id/items")
  @ApiOperation({ summary: "Thêm dịch vụ và mốc thanh toán vào phụ lục" })
  addItems(@Param("id") id: string, @Body() dto: AddAddendumItemsDto) {
    return this.service.addItems(id, dto);
  }

  @Post(":id/upload-signed")
  @ApiOperation({ summary: "Upload bản phụ lục hợp đồng đã ký" })
  uploadSigned(@Param("id") id: string, @Body() dto: UploadSignedAddendumDto) {
    return this.service.uploadSigned(id, dto.file);
  }

  @Post(":id/scale-down")
  @ApiOperation({ summary: "Cắt giảm hạng mục dịch vụ qua phụ lục" })
  scaleDown(@Param("id") id: string, @Body() dto: ScaleDownAddendumDto) {
    return this.service.scaleDown(id, dto);
  }

  @Post(":id/sale-approve")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BD, UserRole.ADMIN)
  @ApiOperation({ summary: "Sale duyệt phụ lục" })
  saleApprove(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: AddendumReviewDto,
  ) {
    return this.service.saleApprove(id, user, dto.note, dto.selectedItems);
  }

  @Post(":id/sale-reject")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BD, UserRole.ADMIN)
  @ApiOperation({ summary: "Sale từ chối phụ lục" })
  saleReject(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: AddendumReviewDto,
  ) {
    return this.service.saleReject(id, user, dto.note);
  }

  @Post(":id/resubmit")
  @ApiOperation({ summary: "Gửi lại phụ lục bị từ chối" })
  resubmit(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: ResubmitAddendumDto,
  ) {
    return this.service.resubmit(id, user, dto);
  }

  @Post(":id/bod-approve")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN)
  @ApiOperation({ summary: "BOD duyệt phụ lục" })
  bodApprove(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: AddendumReviewDto,
  ) {
    return this.service.bodApprove(id, user, dto.note);
  }

  @Post(":id/bod-reject")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN)
  @ApiOperation({ summary: "BOD từ chối phụ lục" })
  bodReject(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: AddendumReviewDto,
  ) {
    return this.service.bodReject(id, user, dto.note);
  }
}
