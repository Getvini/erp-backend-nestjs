import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { SpellingWhitelistService } from "@modules/project/qc/services/spelling-whitelist.service";
import { AddWhitelistWordDto } from "@modules/project/qc/dto/spelling-whitelist.dto";

@ApiTags("Project - Spelling Whitelist")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("projects/:projectId/spelling-whitelist")
export class SpellingWhitelistController {
  constructor(private readonly whitelistService: SpellingWhitelistService) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách từ trong whitelist của dự án" })
  async list(@Param("projectId") projectId: string, @Request() req: any) {
    const items = await this.whitelistService.getWords(projectId, req.user);
    return { items };
  }

  @Post()
  @ApiOperation({ summary: "Thêm từ vào whitelist của dự án" })
  async add(
    @Param("projectId") projectId: string,
    @Body() body: AddWhitelistWordDto,
    @Request() req: any,
  ) {
    const item = await this.whitelistService.addWord(
      projectId,
      body.word,
      req.user,
    );
    return { items: [item] };
  }

  @Delete(":whitelistId")
  @ApiOperation({ summary: "Xóa từ khỏi whitelist" })
  async remove(
    @Param("projectId") projectId: string,
    @Param("whitelistId") whitelistId: string,
    @Request() req: any,
  ) {
    return this.whitelistService.removeWord(projectId, whitelistId, req.user);
  }
}
