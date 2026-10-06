import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { ProjectQueryService } from "../services/project-query.service";
import { QueryProjectDto } from "../dto/project.dto";
import { CurrentUser } from "../../../core/decorators/current-user.decorator";

@ApiTags("Project Management (Dự án & Công việc)")
@ApiBearerAuth()
@Controller("projects")
export class ProjectController {
  constructor(private readonly queryService: ProjectQueryService) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách dự án kèm phân trang" })
  @ApiResponse({ status: 200, description: "Danh sách dự án" })
  async findAll(@Query() query: QueryProjectDto, @CurrentUser() user: any) {
    return this.queryService.getAllProjects(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Xem chi tiết thông tin dự án" })
  @ApiResponse({ status: 200, description: "Chi tiết dự án" })
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.queryService.getProjectById(id, user);
  }
}
