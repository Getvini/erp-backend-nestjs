import {
  Controller,
  Get,
  Put,
  Param,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { NotificationService } from "../services/notification.service";
import {
  NotificationEmitterService,
  GLOBAL_NOTIFICATION_CHANNEL,
} from "../services/notification-emitter.service";
import { CurrentUser } from "@core/decorators/current-user.decorator";
import { Request, Response } from "express";

@ApiTags("Realtime - Notification")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationController {
  constructor(
    private readonly service: NotificationService,
    private readonly emitter: NotificationEmitterService,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Danh sách thông báo của tài khoản hiện tại" })
  getMyNotifications(@CurrentUser() user: any) {
    const userId = user?.userId || user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.service.getMyNotifications(userId);
  }

  @Get("stream")
  @ApiOperation({ summary: "SSE Stream nhận thông báo thời gian thực" })
  streamNotifications(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = user?.userId || user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const heartbeat = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 30000);

    this.emitter.addConnection(GLOBAL_NOTIFICATION_CHANNEL, userId, res);

    req.on("close", () => {
      clearInterval(heartbeat);
      this.emitter.removeConnection(GLOBAL_NOTIFICATION_CHANNEL, userId, res);
      res.end();
    });
  }

  @Put(":id/read")
  @ApiOperation({ summary: "Đánh dấu thông báo đã đọc" })
  markAsRead(@Param("id") id: string) {
    return this.service.markAsRead(id);
  }
}
