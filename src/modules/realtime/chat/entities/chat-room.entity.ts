import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { ChatMessage } from "./chat-message.entity";
import { ChatParticipant } from "./chat-participant.entity";

@Entity("chat_rooms")
export class ChatRoom extends BaseEntity {
  @Column({ nullable: true })
  name: string;

  @Column({ default: false })
  isGroup: boolean;

  @Column({ type: "varchar", length: 26, nullable: true })
  creatorId: string | null;

  @OneToMany(() => ChatParticipant, (p) => p.room)
  participants: ChatParticipant[];

  @OneToMany(() => ChatMessage, (m) => m.room)
  messages: ChatMessage[];
}

export { ChatRoom as ChatRooms };
