import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { AssetService } from "../services/asset.service";
import { QueryAiAssetDto, UpdateAssetFavoriteDto } from "../dto/asset.dto";

@ApiTags("AI Studio - Assets")
@ApiBearerAuth()
@Controller("assets")
@UseGuards(JwtAuthGuard)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách thư viện media/assets của user" })
  async findLibrary(@Req() req: any, @Query() query: QueryAiAssetDto) {
    return this.assetService.findLibrary(req.user.id, {
      tab: query.tab || "creative",
      type: query.type || "all",
      favoritesOnly: Boolean(query.favorite),
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin chi tiết một media/asset" })
  async getOne(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.assetService.getOne(id, req.user.id);
  }

  @Patch(":id/favorite")
  @ApiOperation({ summary: "Bật/tắt trạng thái yêu thích của asset" })
  async toggleFavorite(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateAssetFavoriteDto,
  ) {
    return this.assetService.setFavorite(
      req.user.id,
      id,
      Boolean(body.isFavorite),
    );
  }
}
