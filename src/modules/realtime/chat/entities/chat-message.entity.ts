import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { ChatRoom } from "./chat-room.entity";

@Entity("chat_messages")
@Index(["roomId", "createdAt"])
@Index(["roomId", "id"])
export class ChatMessage extends BaseEntity {
  @Index()
  @Column({ type: "varchar", length: 26 })
  roomId: string;

  @ManyToOne(() => ChatRoom, (r) => r.messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "roomId" })
  room: ChatRoom;

  @Index()
  @Column({ type: "varchar", length: 26 })
  senderId: string;

  @ManyToOne(() => Users, { onDelete: "CASCADE" })
  @JoinColumn({ name: "senderId" })
  sender: Users;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "json", nullable: true })
  attachments:
    | {
        type: string;
        name: string;
        url: string;
        size?: number;
        publicId?: string;
      }[]
    | null;
}

export { ChatMessage as ChatMessages };
