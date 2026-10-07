import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Announcement } from "./announcement.entity";

@Entity("announcement_recipients")
export class AnnouncementRecipient extends BaseEntity {
  @Column({ type: "varchar", length: 26 })
  announcementId: string;

  @ManyToOne(() => Announcement, { onDelete: "CASCADE" })
  @JoinColumn({ name: "announcementId" })
  announcement: Announcement;

  @Column({ type: "varchar", length: 26 })
  recipientId: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "recipientId" })
  recipient: Users;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: "timestamp", nullable: true })
  readAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  lastViewedAt: Date | null;
}

export { AnnouncementRecipient as AnnouncementRecipients };
