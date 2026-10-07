import { Controller, Post, Body, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ChatBotService } from "../services/chat-bot.service";
import { ChatBotMessageDto } from "../dto/chat.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";
import { Request } from "express";

@ApiTags("Realtime - Chat AI Bot")
@ApiBearerAuth()
@Controller("chat")
export class ChatBotController {
  constructor(private readonly chatBotService: ChatBotService) {}

  @Post()
  @ApiOperation({ summary: "Gửi tin nhắn hỏi đáp trợ lý AI (N8N Chatbot)" })
  sendMessage(
    @CurrentUser() user: any,
    @Body() dto: ChatBotMessageDto,
    @Req() req: Request,
  ) {
    const userId = user?.userId || user?.id;
    const fullName = user?.username || user?.fullName || "User";
    const token =
      req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

    return this.chatBotService.sendMessage(
      dto.message,
      userId,
      fullName,
      token,
      dto.sessionId,
    );
  }
}
