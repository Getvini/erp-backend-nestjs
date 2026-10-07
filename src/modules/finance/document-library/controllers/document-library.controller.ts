import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DocumentLibraryService } from "../services/document-library.service";
import {
  QueryDocumentLibraryDto,
  UpdateDocumentDto,
} from "../dto/document-library.dto";
import { Roles } from "@core/decorators/roles.decorator";
import { RolesGuard } from "@core/guards/roles.guard";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@ApiTags("Finance - Document Library")
@ApiBearerAuth()
@Controller("document-library")
export class DocumentLibraryController {
  constructor(private readonly service: DocumentLibraryService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách tài liệu biểu mẫu" })
  findDocuments(@Query() query: QueryDocumentLibraryDto) {
    return this.service.findDocuments(query);
  }

  @Get("tags")
  @ApiOperation({ summary: "Danh sách tất cả tags phân loại tài liệu" })
  getAllTags() {
    return this.service.getAllTags();
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết tài liệu biểu mẫu" })
  getOne(@Param("id") id: string) {
    return this.service.getOne(id);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Lấy link tải tài liệu và tăng downloadCount" })
  download(@Param("id") id: string) {
    return this.service.getDownloadUrl(id);
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "Lịch sử các phiên bản của tài liệu" })
  getVersions(@Param("id") id: string) {
    return this.service.getVersions(id);
  }

  @Get(":id/versions/:versionId/download")
  @ApiOperation({ summary: "Lấy link tải phiên bản cụ thể" })
  downloadVersion(
    @Param("id") id: string,
    @Param("versionId") versionId: string,
  ) {
    return this.service.getVersionDownloadUrl(id, versionId);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Cập nhật thông tin tài liệu" })
  update(@Param("id") id: string, @Body() dto: UpdateDocumentDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Xóa tài liệu" })
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
