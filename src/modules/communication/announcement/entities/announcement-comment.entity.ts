import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Announcement } from "./announcement.entity";

@Entity("announcement_comments")
export class AnnouncementComment extends BaseEntity {
  @Column({ type: "varchar", length: 26 })
  announcementId: string;

  @ManyToOne(() => Announcement, { onDelete: "CASCADE" })
  @JoinColumn({ name: "announcementId" })
  announcement: Announcement;

  @Column({ type: "varchar", length: 26 })
  authorId: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "authorId" })
  author: Users;

  @Column({ type: "text" })
  content: string;
}

export { AnnouncementComment as AnnouncementComments };
