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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { UserQueryService } from "@modules/identity/user/services/user-query.service";
import { UserManagementService } from "@modules/identity/user/services/user-management.service";
import {
  QueryUserDto,
  CreateUserDto,
  UpdateUserDto,
} from "@modules/identity/user/dto/user.dto";
import { Roles } from "@core/decorators/roles.decorator";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@ApiTags("Identity - User")
@ApiBearerAuth()
@Controller("users")
export class UserController {
  constructor(
    private readonly queryService: UserQueryService,
    private readonly managementService: UserManagementService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Lấy danh sách người dùng kèm phân trang và tìm kiếm",
  })
  @ApiResponse({ status: 200, description: "Danh sách nhân sự" })
  async findAll(@Query() query: QueryUserDto) {
    return this.queryService.getAllUsers(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Xem chi tiết nhân viên theo ID" })
  @ApiResponse({ status: 200, description: "Chi tiết nhân sự" })
  async findOne(@Param("id") id: string) {
    return this.queryService.getUserById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BOD)
  @ApiOperation({ summary: "Tạo tài khoản và hồ sơ nhân sự mới (Admin/BOD)" })
  @ApiResponse({ status: 201, description: "Tạo nhân sự thành công" })
  async create(@Body() dto: CreateUserDto) {
    return this.managementService.createUser(dto);
  }

  @Put(":id")
  @Roles(UserRole.ADMIN, UserRole.BOD)
  @ApiOperation({
    summary: "Cập nhật thông tin/vai trò/khóa tài khoản (PUT method cho FE)",
  })
  @ApiResponse({ status: 200, description: "Cập nhật thành công" })
  async updatePut(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.managementService.updateUser(id, dto);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.BOD)
  @ApiOperation({
    summary: "Cập nhật thông tin/vai trò/khóa tài khoản (Admin/BOD)",
  })
  @ApiResponse({ status: 200, description: "Cập nhật thành công" })
  async update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.managementService.updateUser(id, dto);
  }

  @Patch(":id/role")
  @Roles(UserRole.ADMIN, UserRole.BOD)
  @ApiOperation({ summary: "Cập nhật vai trò người dùng" })
  @ApiResponse({ status: 200, description: "Cập nhật vai trò thành công" })
  async updateRole(@Param("id") id: string, @Body("role") role: UserRole) {
    return this.managementService.updateRole(id, role);
  }

  @Patch(":id/labor-contracts")
  @Roles(UserRole.ADMIN, UserRole.BOD, UserRole.ADMIN_SALE)
  @ApiOperation({ summary: "Cập nhật hợp đồng lao động của nhân sự" })
  @ApiResponse({ status: 200, description: "Cập nhật hợp đồng thành công" })
  async updateLaborContracts(
    @Param("id") id: string,
    @Body("laborContract") laborContract: any[],
  ) {
    return this.managementService.updateLaborContracts(id, laborContract);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN, UserRole.BOD)
  @ApiOperation({ summary: "Xóa nhân viên (Admin/BOD)" })
  @ApiResponse({ status: 200, description: "Xóa nhân sự thành công" })
  async remove(@Param("id") id: string) {
    return this.managementService.deleteUser(id);
  }
}
