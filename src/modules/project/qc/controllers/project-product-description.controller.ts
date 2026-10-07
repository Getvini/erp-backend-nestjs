import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard";
import { ProjectProductDescriptionService } from "../services/project-product-description.service";

@ApiTags("Project - Product Description")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("projects/:id/product-descriptions")
export class ProjectProductDescriptionController {
  constructor(private readonly service: ProjectProductDescriptionService) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách bản mô tả chuẩn sản phẩm của dự án" })
  async getByProject(@Param("id") id: string, @Request() req: any) {
    return this.service.getByProject(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: "Tạo bản mô tả chuẩn sản phẩm mới" })
  async create(
    @Param("id") id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.service.create(id, body, req.user);
  }

  @Put(":submissionId")
  @ApiOperation({ summary: "Cập nhật bản mô tả chuẩn sản phẩm" })
  async update(
    @Param("id") id: string,
    @Param("submissionId") submissionId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.service.update(id, submissionId, body, req.user);
  }

  @Post(":submissionId/submit")
  @ApiOperation({ summary: "Gửi duyệt bản mô tả chuẩn sản phẩm" })
  async submit(
    @Param("id") id: string,
    @Param("submissionId") submissionId: string,
    @Request() req: any,
  ) {
    return this.service.submit(id, submissionId, req.user);
  }

  @Post(":submissionId/approve")
  @ApiOperation({ summary: "Duyệt bản mô tả chuẩn sản phẩm" })
  async approve(
    @Param("id") id: string,
    @Param("submissionId") submissionId: string,
    @Request() req: any,
  ) {
    return this.service.approve(id, submissionId, req.user);
  }

  @Post(":submissionId/reject")
  @ApiOperation({ summary: "Từ chối bản mô tả chuẩn sản phẩm" })
  async reject(
    @Param("id") id: string,
    @Param("submissionId") submissionId: string,
    @Body("note") note: string,
    @Request() req: any,
  ) {
    return this.service.reject(id, submissionId, note, req.user);
  }
}
