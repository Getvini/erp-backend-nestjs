import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { SpellingCheckService } from "@modules/project/qc/services/spelling-check.service";
import { SpellingCheckFromUrlDto } from "@modules/project/qc/dto/spelling-check.dto";

@ApiTags("Project - Spelling Check")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("spelling-check")
export class SpellingCheckController {
  constructor(private readonly spellingService: SpellingCheckService) {}

  @Post("sheets-from-url")
  @ApiOperation({ summary: "Lấy danh sách sheets từ URL file" })
  async listSheetsFromUrl(
    @Body("fileUrl") fileUrl: string,
    @Body("fileName") fileName: string,
  ) {
    return this.spellingService.listSheetsFromUrl(
      fileUrl,
      fileName || "file.xlsx",
    );
  }

  @Post("start-from-url")
  @ApiOperation({ summary: "Bắt đầu kiểm tra chính tả từ URL file" })
  async startFromUrl(@Body() body: SpellingCheckFromUrlDto) {
    return this.spellingService.startFromUrl(
      body.fileUrl,
      body.fileName || "file.xlsx",
      body.lang || "both",
      body.sheetNames,
      body.whitelist,
      body.scenarioIds,
      body.regions,
    );
  }

  @Get(":jobId")
  @ApiOperation({ summary: "Lấy trạng thái tác vụ kiểm tra chính tả" })
  async getStatus(@Param("jobId") jobId: string) {
    return this.spellingService.getStatus(jobId);
  }

  @Delete(":jobId")
  @ApiOperation({ summary: "Xóa tác vụ kiểm tra chính tả" })
  async delete(@Param("jobId") jobId: string) {
    return this.spellingService.delete(jobId);
  }
}
