import { Controller, Get, Param, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard";
import { QcScanService } from "../services/qc-scan.service";

@ApiTags("Project - QC Engine")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("qc")
export class QcController {
  constructor(private readonly qcService: QcScanService) {}

  @Get("product-info/:projectId")
  @ApiOperation({
    summary: "Lấy thông tin chuẩn sản phẩm đã được duyệt của dự án",
  })
  async getProductInfo(
    @Param("projectId") projectId: string,
    @Request() req: any,
  ) {
    const items = await this.qcService.getApprovedProductInfo(
      projectId,
      req.user,
    );
    return { items };
  }
}
