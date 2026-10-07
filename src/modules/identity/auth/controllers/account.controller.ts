import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { RolesGuard } from "@core/guards/roles.guard";
import { Roles } from "@core/decorators/roles.decorator";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { AccountService } from "@modules/identity/auth/services/account.service";
import {
  UpdateAccountDto,
  ResetAccountPasswordDto,
} from "@modules/identity/auth/dto/auth.dto";

@ApiTags("Identity - Account")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.BOD, "ADMIN", "BOD")
@Controller("accounts")
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách tất cả tài khoản" })
  async index() {
    return this.accountService.getAllAccounts();
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết tài khoản theo ID" })
  async show(@Param("id") id: string) {
    return this.accountService.getAccountById(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Cập nhật tài khoản" })
  async update(@Param("id") id: string, @Body() body: UpdateAccountDto) {
    const result = await this.accountService.updateAccount(id, body);
    return {
      message: "Cập nhật tài khoản thành công",
      account: result,
    };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Vô hiệu hóa (xóa mềm) tài khoản" })
  async delete(@Param("id") id: string) {
    await this.accountService.softDeleteAccount(id);
    return { message: "Xóa (vô hiệu hóa) tài khoản thành công" };
  }

  @Put(":id/reset-password")
  @ApiOperation({ summary: "Đặt lại mật khẩu cho tài khoản" })
  async resetPassword(
    @Param("id") id: string,
    @Body() body: ResetAccountPasswordDto,
  ) {
    await this.accountService.resetPassword(id, body.newPassword);
    return { message: "Đặt lại mật khẩu thành công" };
  }
}
