import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { JobCriteriaService } from "@modules/project/task/services/job-criteria.service";
import {
  CreateJobCriteriaDto,
  SyncJobCriteriaItemDto,
} from "@modules/project/task/dto/job-criteria.dto";

@ApiTags("Project - Job Criteria")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("job-criteria")
export class JobCriteriaController {
  constructor(private readonly criteriaService: JobCriteriaService) {}

  @Get("job/:jobId")
  @ApiOperation({ summary: "Lấy danh sách tiêu chí theo Job" })
  async getByJob(@Param("jobId") jobId: string) {
    return this.criteriaService.getByJob(jobId);
  }

  @Post()
  @ApiOperation({ summary: "Tạo mới tiêu chí cho Job" })
  async create(@Body() body: CreateJobCriteriaDto) {
    return this.criteriaService.create(body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa tiêu chí theo ID" })
  async delete(@Param("id") id: string) {
    return this.criteriaService.delete(id);
  }

  @Put("job/:jobId")
  @ApiOperation({ summary: "Đồng bộ danh sách tiêu chí theo Job" })
  async sync(
    @Param("jobId") jobId: string,
    @Body() body: SyncJobCriteriaItemDto[],
  ) {
    const list = Array.isArray(body) ? body : (body as any).criteria || [];
    return this.criteriaService.syncCriteria(jobId, list);
  }
}
