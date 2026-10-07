import { Controller, Get, Put, Body, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { RolesGuard } from "@core/guards/roles.guard";
import { Roles } from "@core/decorators/roles.decorator";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { SettingService } from "@modules/system/setting/services/setting.service";
import { UpdateQcConfigDto, UpdateWorkloadNormsDto } from "@modules/system/setting/dto/setting.dto";

@ApiTags("System - Setting")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, "ADMIN")
@Controller("settings")
export class SettingController {
  constructor(private readonly service: SettingService) {}

  @Get("qc")
  @ApiOperation({ summary: "Lấy cấu hình kiểm định QC và danh sách tùy chọn" })
  async getQc() {
    const config = await this.service.getQcConfig();
    return { config, options: this.service.getQcOptions() };
  }

  @Put("qc")
  @ApiOperation({ summary: "Cập nhật cấu hình kiểm định QC" })
  async updateQc(@Body() body: UpdateQcConfigDto, @Request() req: any) {
    const config = await this.service.updateQcConfig(body, req.user);
    return { config, options: this.service.getQcOptions() };
  }

  @Get("workload-norms")
  @ApiOperation({ summary: "Lấy danh sách định mức công việc theo vai trò" })
  async getWorkloadNorms() {
    const norms = await this.service.getWorkloadNorms();
    return { norms };
  }

  @Put("workload-norms")
  @ApiOperation({ summary: "Cập nhật danh sách định mức công việc" })
  async updateWorkloadNorms(
    @Body() body: UpdateWorkloadNormsDto,
    @Request() req: any,
  ) {
    const norms = await this.service.updateWorkloadNorms(body.norms, req.user);
    return { norms };
  }
}
