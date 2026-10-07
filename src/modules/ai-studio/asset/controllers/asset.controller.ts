import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { AssetService } from "../services/asset.service";

@ApiTags("AI Studio - Assets")
@ApiBearerAuth()
@Controller("assets")
@UseGuards(JwtAuthGuard)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách thư viện media/assets của user" })
  async findLibrary(
    @Req() req: any,
    @Query("tab") tab?: string,
    @Query("type") type?: string,
    @Query("favorite") favorite?: string,
  ) {
    return this.assetService.findLibrary(req.user.id, {
      tab: tab || "creative",
      type: type || "all",
      favoritesOnly: favorite === "true",
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin chi tiết một media/asset" })
  async getOne(@Req() req: any, @Param("id") id: string) {
    return this.assetService.getOne(Number(id), req.user.id);
  }

  @Patch(":id/favorite")
  @ApiOperation({ summary: "Bật/tắt trạng thái yêu thích của asset" })
  async toggleFavorite(
    @Req() req: any,
    @Param("id") id: string,
    @Body("isFavorite") isFavorite: boolean,
  ) {
    return this.assetService.setFavorite(
      req.user.id,
      Number(id),
      Boolean(isFavorite),
    );
  }
}
