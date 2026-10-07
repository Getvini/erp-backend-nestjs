import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";

@Entity("notifications")
@Index(["recipientId", "createdAt"])
@Index(["recipientId", "isRead", "createdAt"])
export class Notification extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column()
  type: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: "timestamp", nullable: true })
  readAt: Date | null;

  @Column({ nullable: true })
  link: string;

  @Column({ nullable: true })
  relatedEntityId: string;

  @Column({ nullable: true })
  relatedEntityType: string;

  @Index()
  @Column({ type: "varchar", length: 26 })
  recipientId: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "recipientId" })
  recipient: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  senderId: string | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "senderId" })
  sender: Users;
}

export { Notification as Notifications };
