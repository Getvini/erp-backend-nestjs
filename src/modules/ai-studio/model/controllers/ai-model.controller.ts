import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { RolesGuard } from "@core/guards/roles.guard";
import { Roles } from "@core/decorators/roles.decorator";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { AiModelService } from "../services/ai-model.service";
import {
  CreateAiModelDto,
  UpdateAiModelDto,
  QueryAiModelDto,
} from "../dto/ai-model.dto";

@ApiTags("AI Studio - Models")
@ApiBearerAuth()
@Controller("ai-models")
@UseGuards(JwtAuthGuard)
export class AiModelController {
  constructor(private readonly modelService: AiModelService) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách các AI models có hỗ trợ lọc" })
  async getAll(@Query() query: QueryAiModelDto) {
    return this.modelService.getAll(query);
  }

  @Get("provider/:providerCode")
  @ApiOperation({ summary: "Lấy danh sách models theo provider code" })
  async getByProvider(@Param("providerCode") providerCode: string) {
    return this.modelService.getByProviderCode(providerCode);
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin chi tiết một AI model" })
  async getOne(@Param("id") id: string) {
    return this.modelService.getOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Tạo mới AI model (Admin)" })
  async create(@Body() body: CreateAiModelDto) {
    return this.modelService.create(body);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Cập nhật cấu hình AI model (Admin)" })
  async update(@Param("id") id: string, @Body() body: UpdateAiModelDto) {
    return this.modelService.update(id, body);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Xóa AI model (Admin)" })
  async delete(@Param("id") id: string) {
    return this.modelService.delete(id);
  }
}
