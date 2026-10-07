import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Not, MoreThan, LessThan } from "typeorm";
import { ChatRoom } from "../entities/chat-room.entity";
import { ChatMessage } from "../entities/chat-message.entity";
import { ChatParticipant } from "../entities/chat-participant.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import {
  resolveChatUserId,
  resolveChatUserIds,
} from "../helpers/chat-user-resolver.helper";

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepo: Repository<ChatParticipant>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @InjectRepository(Accounts)
    private readonly accountRepo: Repository<Accounts>,
  ) {}

  private async resolveUserId(id: string): Promise<string> {
    return resolveChatUserId(id, this.userRepo, this.accountRepo);
  }

  private async resolveUserIds(ids: string[]): Promise<string[]> {
    return resolveChatUserIds(ids, this.userRepo, this.accountRepo);
  }

  async getUserRooms(userId: string) {
    const participations = await this.participantRepo.find({
      where: { userId },
      select: ["roomId"],
    });
    if (!participations.length) return [];

    const roomIds = participations.map((p) => p.roomId);
    const rooms = await this.roomRepo.find({
      where: { id: In(roomIds) },
      order: { updatedAt: "DESC" },
    });

    const enriched = await Promise.all(
      rooms.map(async (room) => {
        const participants = await this.participantRepo.find({
          where: { roomId: room.id },
          relations: ["user"],
        });
        const latestMessage = await this.messageRepo.findOne({
          where: { roomId: room.id },
          order: { createdAt: "DESC" },
          relations: ["sender"],
        });
        const myPart = participants.find((p) => p.userId === userId);
        const lastReadAt = myPart?.lastReadAt;
        const unreadCount = await this.messageRepo.count({
          where: {
            roomId: room.id,
            senderId: Not(userId),
            ...(lastReadAt ? { createdAt: MoreThan(lastReadAt) } : {}),
          },
        });
        return {
          ...room,
          participants,
          latestMessage,
          unread: unreadCount > 0,
          unreadCount,
        };
      }),
    );

    return enriched.sort((a, b) => {
      const timeA = a.latestMessage?.createdAt || a.updatedAt;
      const timeB = b.latestMessage?.createdAt || b.updatedAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }

  async getOrCreateDM(userId1: string, recipientId: string) {
    const userId2 = await this.resolveUserId(recipientId);
    const rooms1 = await this.participantRepo.find({
      where: { userId: userId1 },
      select: ["roomId"],
    });
    const rooms2 = await this.participantRepo.find({
      where: { userId: userId2 },
      select: ["roomId"],
    });

    const roomIds2 = new Set(rooms2.map((r) => r.roomId));
    const commonIds = rooms1
      .map((r) => r.roomId)
      .filter((id) => roomIds2.has(id));

    if (commonIds.length > 0) {
      const dmRooms = await this.roomRepo.find({
        where: { id: In(commonIds), isGroup: false },
      });
      if (dmRooms.length > 0) {
        const room = dmRooms[0];
        const participants = await this.participantRepo.find({
          where: { roomId: room.id },
          relations: ["user"],
        });
        return { ...room, participants };
      }
    }

    const room = await this.roomRepo.save(
      this.roomRepo.create({ isGroup: false, creatorId: userId1 }),
    );
    await this.participantRepo.save([
      this.participantRepo.create({ roomId: room.id, userId: userId1 }),
      this.participantRepo.create({ roomId: room.id, userId: userId2 }),
    ]);

    const participants = await this.participantRepo.find({
      where: { roomId: room.id },
      relations: ["user"],
    });
    return { ...room, participants };
  }

  async createGroup(creatorId: string, name: string, participantIds: string[]) {
    const resolvedIds = await this.resolveUserIds([
      creatorId,
      ...participantIds,
    ]);
    const room = await this.roomRepo.save(
      this.roomRepo.create({ isGroup: true, name, creatorId }),
    );

    const parts = resolvedIds.map((uid) =>
      this.participantRepo.create({ roomId: room.id, userId: uid }),
    );
    await this.participantRepo.save(parts);

    const participants = await this.participantRepo.find({
      where: { roomId: room.id },
      relations: ["user"],
    });
    return { ...room, participants };
  }

  async isParticipant(roomId: string, userId: string): Promise<boolean> {
    const p = await this.participantRepo.findOne({
      where: { roomId, userId },
    });
    return Boolean(p);
  }

  async addParticipants(roomId: string, participantIds: string[]) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException("Không tìm thấy phòng chat");
    if (!room.isGroup) {
      throw new BadRequestException(
        "Không thể thêm thành viên vào cuộc trò chuyện 1-1",
      );
    }

    const resolvedIds = await this.resolveUserIds(participantIds);
    const existing = await this.participantRepo.find({
      where: { roomId, userId: In(resolvedIds) },
    });
    const existingUids = new Set(existing.map((e) => e.userId));
    const toAdd = resolvedIds.filter((uid) => !existingUids.has(uid));

    if (toAdd.length > 0) {
      await this.participantRepo.save(
        toAdd.map((uid) =>
          this.participantRepo.create({ roomId, userId: uid }),
        ),
      );
    }
    return this.participantRepo.find({
      where: { roomId },
      relations: ["user"],
    });
  }

  async getRoomMessages(roomId: string, limit = 50, cursor?: string) {
    const where: any = { roomId };
    if (cursor) {
      const cursorMsg = await this.messageRepo.findOne({
        where: { id: cursor },
      });
      if (cursorMsg) {
        where.createdAt = LessThan(cursorMsg.createdAt);
      }
    }
    const messages = await this.messageRepo.find({
      where,
      order: { createdAt: "DESC" },
      take: Math.min(limit, 100),
      relations: ["sender"],
    });
    return messages.reverse();
  }

  async createMessage(
    roomId: string,
    senderId: string,
    content: string,
    attachments: any[] = [],
  ) {
    const isMember = await this.isParticipant(roomId, senderId);
    if (!isMember) {
      throw new ForbiddenException("Bạn không thuộc phòng chat này");
    }

    const msg = await this.messageRepo.save(
      this.messageRepo.create({
        roomId,
        senderId,
        content,
        attachments: attachments.length ? attachments : null,
      }),
    );
    await this.roomRepo.update(roomId, { updatedAt: new Date() });
    return this.messageRepo.findOne({
      where: { id: msg.id },
      relations: ["sender"],
    });
  }

  async markRoomAsRead(roomId: string, userId: string) {
    const part = await this.participantRepo.findOne({
      where: { roomId, userId },
    });
    if (!part) return;
    part.lastReadAt = new Date();
    await this.participantRepo.save(part);
  }
}
