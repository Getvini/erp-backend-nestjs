import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ChatBotService } from "../services/chat-bot.service";
import { ChatBotMessageDto } from "../dto/chat.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";

@ApiTags("Realtime - Chat AI Bot")
@ApiBearerAuth()
@Controller("chat")
export class ChatBotController {
  constructor(private readonly chatBotService: ChatBotService) {}

  @Post()
  @ApiOperation({ summary: "Gửi tin nhắn hỏi đáp trợ lý AI (N8N Chatbot)" })
  sendMessage(@CurrentUser() user: any, @Body() dto: ChatBotMessageDto) {
    const userId = user?.userId || user?.id;
    const fullName = user?.username || user?.fullName || "User";

    return this.chatBotService.sendMessage(
      dto.message,
      userId,
      fullName,
      undefined,
      dto.sessionId,
    );
  }
}
