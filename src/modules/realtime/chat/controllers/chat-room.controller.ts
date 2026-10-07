import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ChatRoomService } from "../services/chat-room.service";
import {
  CreateRoomDto,
  AddParticipantsDto,
  SendChatMessageDto,
} from "../dto/chat.dto";
import { CurrentUser } from "@core/decorators/current-user.decorator";
import { Throttle } from "@nestjs/throttler";

@ApiTags("Realtime - Chat Room")
@ApiBearerAuth()
@Controller("chat-rooms")
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách phòng chat của người dùng" })
  getUserRooms(@CurrentUser() user: any) {
    const userId = user?.userId || user?.id;
    return this.chatRoomService.getUserRooms(userId);
  }

  @Post()
  @ApiOperation({ summary: "Tạo phòng chat mới (nhóm hoặc 1-1)" })
  createRoom(@CurrentUser() user: any, @Body() dto: CreateRoomDto) {
    const userId = user?.userId || user?.id;
    if (dto.isGroup) {
      if (!dto.name) {
        throw new BadRequestException("Tên nhóm không được để trống");
      }
      if (!dto.participantIds || !Array.isArray(dto.participantIds)) {
        throw new BadRequestException("Danh sách thành viên không hợp lệ");
      }
      return this.chatRoomService.createGroup(
        userId,
        dto.name,
        dto.participantIds,
      );
    }

    if (!dto.recipientId) {
      throw new BadRequestException("Thiếu thông tin người nhận");
    }
    return this.chatRoomService.getOrCreateDM(userId, dto.recipientId);
  }

  @Post(":roomId/participants")
  @ApiOperation({ summary: "Thêm thành viên vào phòng chat nhóm" })
  addParticipants(
    @CurrentUser() user: any,
    @Param("roomId") roomId: string,
    @Body() dto: AddParticipantsDto,
  ) {
    const userId = user?.userId || user?.id;
    return this.chatRoomService.addParticipants(
      roomId,
      dto.participantIds,
      userId,
    );
  }

  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Get(":roomId/messages")
  @ApiOperation({ summary: "Lấy lịch sử tin nhắn trong phòng chat" })
  getRoomMessages(
    @CurrentUser() user: any,
    @Param("roomId") roomId: string,
    @Query("limit") limit?: number,
    @Query("cursor") cursor?: string,
  ) {
    const userId = user?.userId || user?.id;
    return this.chatRoomService.getRoomMessages(
      roomId,
      userId,
      limit ? Number(limit) : 50,
      cursor,
    );
  }

  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Post(":roomId/messages")
  @ApiOperation({ summary: "Gửi tin nhắn vào phòng chat" })
  sendMessage(
    @CurrentUser() user: any,
    @Param("roomId") roomId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    const userId = user?.userId || user?.id;
    return this.chatRoomService.createMessage(
      roomId,
      userId,
      dto.content,
      dto.attachments,
    );
  }

  @Post(":roomId/read")
  @ApiOperation({ summary: "Đánh dấu đã đọc toàn bộ tin nhắn trong phòng" })
  async markRoomAsRead(
    @CurrentUser() user: any,
    @Param("roomId") roomId: string,
  ) {
    const userId = user?.userId || user?.id;
    await this.chatRoomService.markRoomAsRead(roomId, userId);
    return { success: true };
  }
}
