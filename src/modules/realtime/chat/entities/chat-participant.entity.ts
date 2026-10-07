import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { ChatRoom } from "./chat-room.entity";

@Entity("chat_participants")
@Index(["roomId", "userId"])
export class ChatParticipant extends BaseEntity {
  @Index()
  @Column({ type: "varchar", length: 26 })
  roomId: string;

  @ManyToOne(() => ChatRoom, (r) => r.participants, { onDelete: "CASCADE" })
  @JoinColumn({ name: "roomId" })
  room: ChatRoom;

  @Index()
  @Column({ type: "varchar", length: 26 })
  userId: string;

  @ManyToOne(() => Users, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: Users;

  @Column({ type: "timestamp", nullable: true })
  lastReadAt: Date | null;
}

export { ChatParticipant as ChatParticipants };
