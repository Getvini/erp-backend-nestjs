import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { AiProviderService } from "../services/ai-provider.service";
import { QueryAiProviderDto } from "../dto/ai-provider.dto";

@ApiTags("AI Studio - Providers")
@ApiBearerAuth()
@Controller("ai-providers")
@UseGuards(JwtAuthGuard)
export class AiProviderController {
  constructor(private readonly providerService: AiProviderService) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách các AI providers" })
  async getAll(@Query() query: QueryAiProviderDto) {
    return this.providerService.getAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin chi tiết một AI provider" })
  async getOne(@Param("id") id: string) {
    return this.providerService.getOne(id);
  }
}
