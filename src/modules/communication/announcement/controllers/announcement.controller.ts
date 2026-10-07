import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AnnouncementService } from "../services/announcement.service";
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  CreateAnnouncementCommentDto,
} from "../dto/announcement.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";

@ApiTags("Communication - Announcement")
@ApiBearerAuth()
@Controller("announcements")
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách bản tin thông báo" })
  getAll(@CurrentUser() user: any) {
    return this.service.getAll(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết một bản tin" })
  getOne(@Param("id") id: string, @CurrentUser() user: any) {
    const userId = user?.userId || user?.id;
    return this.service.getOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: "Tạo bản tin thông báo mới" })
  create(@CurrentUser() user: any, @Body() dto: CreateAnnouncementDto) {
    const userId = user?.userId || user?.id;
    return this.service.create(dto, userId);
  }

  @Put(":id")
  @ApiOperation({ summary: "Cập nhật bản tin" })
  update(@Param("id") id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa bản tin" })
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }

  @Put(":id/read")
  @ApiOperation({ summary: "Đánh dấu đã đọc bản tin" })
  markAsRead(@Param("id") id: string, @CurrentUser() user: any) {
    const userId = user?.userId || user?.id;
    return this.service.markAsRead(id, userId);
  }

  @Get(":id/comments")
  @ApiOperation({ summary: "Danh sách bình luận của bản tin" })
  getComments(@Param("id") id: string) {
    return this.service.getComments(id);
  }

  @Post(":id/comments")
  @ApiOperation({ summary: "Thêm bình luận vào bản tin" })
  addComment(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateAnnouncementCommentDto,
  ) {
    const userId = user?.userId || user?.id;
    return this.service.addComment(id, userId, dto.content);
  }

  @Delete(":id/comments/:commentId")
  @ApiOperation({ summary: "Xóa bình luận" })
  deleteComment(
    @Param("commentId") commentId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.userId || user?.id;
    return this.service.deleteComment(commentId, userId);
  }
}
