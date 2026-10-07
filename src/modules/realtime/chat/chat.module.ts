import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatRoom } from "./entities/chat-room.entity";
import { ChatMessage } from "./entities/chat-message.entity";
import { ChatParticipant } from "./entities/chat-participant.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { ChatRoomService } from "./services/chat-room.service";
import { ChatBotService } from "./services/chat-bot.service";
import { ChatRoomController } from "./controllers/chat-room.controller";
import { ChatBotController } from "./controllers/chat-bot.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoom,
      ChatMessage,
      ChatParticipant,
      Users,
      Accounts,
    ]),
  ],
  controllers: [ChatRoomController, ChatBotController],
  providers: [ChatRoomService, ChatBotService],
  exports: [ChatRoomService, ChatBotService],
})
export class ChatModule {}
