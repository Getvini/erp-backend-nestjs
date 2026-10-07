import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { AiElementService } from "../services/ai-element.service";
import { CreateElementDto } from "../dto/ai-element.dto";

@ApiTags("AI Studio - Elements")
@ApiBearerAuth()
@Controller("elements")
@UseGuards(JwtAuthGuard)
export class AiElementController {
  constructor(private readonly elementService: AiElementService) {}

  @Post("create")
  @ApiOperation({ summary: "Tạo mới element AI (nhân vật, trang phục)" })
  async create(@Req() req: any, @Body() body: CreateElementDto) {
    return this.elementService.create(req.user.id, body);
  }

  @Get("history")
  @ApiOperation({ summary: "Lấy lịch sử các elements của user" })
  async getHistory(@Req() req: any) {
    return this.elementService.getHistory(req.user.id);
  }

  @Get("task/:taskId/status")
  @ApiOperation({ summary: "Lấy trạng thái task sinh element từ Kling" })
  async getKlingTaskStatus(@Param("taskId") taskId: string) {
    return this.elementService.getKlingTaskStatus(taskId);
  }

  @Get(":id/status")
  @ApiOperation({ summary: "Lấy trạng thái chi tiết của element" })
  async getStatus(@Param("id") id: string) {
    return this.elementService.getStatus(Number(id));
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa element khỏi hệ thống" })
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.elementService.remove(req.user.id, Number(id));
  }

  @Patch(":id/favorite")
  @ApiOperation({ summary: "Bật/tắt trạng thái yêu thích của element" })
  async setFavorite(
    @Req() req: any,
    @Param("id") id: string,
    @Body("isFavorite") isFavorite: boolean,
  ) {
    return this.elementService.setFavorite(
      req.user.id,
      Number(id),
      Boolean(isFavorite),
    );
  }
}
