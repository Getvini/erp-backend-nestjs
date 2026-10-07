import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { TaskQueryService } from "@modules/project/task/services/task-query.service";
import { TaskWorkloadService } from "@modules/project/task/services/task-workload.service";
import {
  TaskQueryDto,
  DailyWorkloadQueryDto,
} from "@modules/project/task/dto/task.dto";

@ApiTags("Project - Task")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tasks")
export class TaskQueryController {
  constructor(
    private readonly queryService: TaskQueryService,
    private readonly workloadService: TaskWorkloadService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách công việc (có phân trang & lọc)" })
  async getAll(@Query() filters: TaskQueryDto, @Request() req: any) {
    return this.queryService.getAll(filters, req.user);
  }

  @Get("assignee/:userId/daily-workload")
  @ApiOperation({ summary: "Xem tải công việc hàng ngày của nhân viên" })
  async getDailyWorkloadByAssignee(
    @Param("userId") userId: string,
    @Query() query: DailyWorkloadQueryDto,
  ) {
    return this.workloadService.getDailyWorkloadByAssignee(
      userId,
      query.startDate,
      query.endDate,
    );
  }

  @Get("project/:projectId")
  @ApiOperation({ summary: "Lấy danh sách công việc theo dự án" })
  async getByProject(
    @Param("projectId") projectId: string,
    @Query() query: TaskQueryDto,
    @Request() req: any,
  ) {
    return this.queryService.getByProject(projectId, query, req.user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Xem chi tiết một công việc" })
  async getOne(@Param("id") id: string, @Request() req: any) {
    return this.queryService.getOne(id, req.user);
  }
}
