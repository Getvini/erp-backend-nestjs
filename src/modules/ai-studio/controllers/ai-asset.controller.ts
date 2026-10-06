import { Controller, Get } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { AiAssetService } from "../services/ai-asset.service";
import { CurrentUser } from "../../../core/decorators/current-user.decorator";

@ApiTags("AI Studio (Tài nguyên & Thế hệ Video AI)")
@ApiBearerAuth()
@Controller("ai-studio/assets")
export class AiAssetController {
  constructor(private readonly aiAssetService: AiAssetService) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách media tài nguyên AI" })
  @ApiResponse({ status: 200, description: "Danh sách media AI" })
  async findAll(@CurrentUser() user: any) {
    return this.aiAssetService.getAllAssets(user);
  }
}
