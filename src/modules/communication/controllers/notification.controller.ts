import { Controller, Get } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { NotificationService } from "@modules/communication/services/notification.service";
import { CurrentUser } from "@core/decorators/current-user.decorator";

@ApiTags("Communication (Thông báo & Tin nhắn)")
@ApiBearerAuth()
@Controller("communication/notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get("my")
  @ApiOperation({ summary: "Lấy danh sách thông báo của tài khoản hiện tại" })
  @ApiResponse({ status: 200, description: "Danh sách thông báo" })
  async getMyNotifications(@CurrentUser() user: any) {
    return this.notificationService.getMyNotifications(user);
  }
}
