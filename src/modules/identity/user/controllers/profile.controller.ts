import { Controller, Get, Patch, Post, Body } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { ProfileService } from "@modules/identity/user/services/profile.service";
import {
  UpdateProfileDto,
  ChangePasswordDto,
} from "@modules/identity/user/dto/profile.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";

@ApiTags("Identity - User")
@ApiBearerAuth()
@Controller("me")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: "Lấy thông tin cá nhân của tài khoản hiện tại" })
  @ApiResponse({ status: 200, description: "Thông tin hồ sơ người dùng" })
  async getProfile(@CurrentUser() currentUser: any) {
    return this.profileService.getMyProfile(currentUser);
  }

  @Patch()
  @ApiOperation({ summary: "Cập nhật thông tin cá nhân" })
  @ApiResponse({ status: 200, description: "Hồ sơ đã được cập nhật" })
  async updateProfile(
    @CurrentUser() currentUser: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(currentUser, dto);
  }

  @Post("change-password")
  @ApiOperation({ summary: "Đổi mật khẩu tài khoản" })
  @ApiResponse({ status: 200, description: "Đổi mật khẩu thành công" })
  async changePassword(
    @CurrentUser() currentUser: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(currentUser, dto);
  }
}
