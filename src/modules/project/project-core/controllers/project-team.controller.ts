import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ProjectTeamService } from "../services/project-team.service";
import {
  CreateProjectTeamDto,
  UpdateProjectTeamDto,
  ChangeLeadDto,
  AddTeamMemberDto,
  UpdateMemberRolesDto,
} from "../dto/project-team.dto";
import { CurrentUser } from "../../../../core/decorators/current-user.decorator";

@ApiTags("Project - Team")
@ApiBearerAuth()
@Controller("teams")
export class ProjectTeamController {
  constructor(private readonly teamService: ProjectTeamService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách đội dự án" })
  async getAll() {
    return await this.teamService.getAll();
  }

  @Post()
  @ApiOperation({ summary: "Tạo đội dự án mới" })
  async create(@Body() dto: CreateProjectTeamDto, @CurrentUser() user: any) {
    return await this.teamService.create(dto, user);
  }

  @Get(":id/members")
  @ApiOperation({ summary: "Danh sách thành viên đội dự án" })
  async getMembers(
    @Param("id") id: string,
    @Query("month") month?: number,
    @Query("year") year?: number,
  ) {
    return await this.teamService.getMembers(id, month, year);
  }

  @Post(":id/members")
  @ApiOperation({ summary: "Thêm thành viên vào đội" })
  async addMember(
    @Param("id") id: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: any,
  ) {
    return await this.teamService.addMember(id, dto, user);
  }

  @Put(":id/members/:userId/roles")
  @ApiOperation({ summary: "Cập nhật vai trò thành viên" })
  async updateMemberRoles(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateMemberRolesDto,
    @CurrentUser() user: any,
  ) {
    return await this.teamService.updateMemberRoles(
      id,
      userId,
      dto.roles,
      user,
    );
  }

  @Put(":id/lead")
  @ApiOperation({ summary: "Thay đổi Team Lead" })
  async changeLead(
    @Param("id") id: string,
    @Body() dto: ChangeLeadDto,
    @CurrentUser() user: any,
  ) {
    return await this.teamService.changeLead(id, dto.teamLeadId, user);
  }

  @Patch("members/:memberId")
  @ApiOperation({ summary: "Cập nhật thông tin thành viên" })
  async updateMember(
    @Param("memberId") memberId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return await this.teamService.updateMember(memberId, body, user);
  }

  @Delete("members/:memberId")
  @ApiOperation({ summary: "Xóa thành viên khỏi đội" })
  async removeMember(
    @Param("memberId") memberId: string,
    @CurrentUser() user: any,
  ) {
    return await this.teamService.removeMember(memberId, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết đội dự án" })
  async getOne(@Param("id") id: string) {
    return await this.teamService.getOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Cập nhật đội dự án" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateProjectTeamDto,
    @CurrentUser() user: any,
  ) {
    return await this.teamService.update(id, dto, user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa đội dự án" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return await this.teamService.delete(id, user);
  }
}
