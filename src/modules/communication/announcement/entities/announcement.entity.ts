import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";

export enum AnnouncementCategory {
  GENERAL = "GENERAL",
  HR = "HR",
  POLICY = "POLICY",
  EVENT = "EVENT",
  URGENT = "URGENT",
  FINANCE = "FINANCE",
  SYSTEM = "SYSTEM",
}

export enum AnnouncementPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum AnnouncementScopeType {
  ALL = "ALL",
  ROLE = "ROLE",
  TEAM = "TEAM",
  USER = "USER",
}

export enum AnnouncementStatus {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  SENT = "SENT",
  CANCELLED = "CANCELLED",
}

@Entity("announcements")
export class Announcement extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({
    type: "enum",
    enum: AnnouncementCategory,
    default: AnnouncementCategory.GENERAL,
  })
  category: AnnouncementCategory;

  @Column({
    type: "enum",
    enum: AnnouncementPriority,
    default: AnnouncementPriority.NORMAL,
  })
  priority: AnnouncementPriority;

  @Column({ type: "enum", enum: AnnouncementScopeType })
  scopeType: AnnouncementScopeType;

  @Column({ type: "simple-array", nullable: true })
  targetRoles: string[];

  @Column({ type: "simple-array", nullable: true })
  targetTeamIds: string[];

  @Column({ type: "simple-array", nullable: true })
  targetUserIds: string[];

  @Column({ type: "timestamp", nullable: true })
  eventStartAt: Date;

  @Column({ type: "timestamp", nullable: true })
  eventEndAt: Date;

  @Column({ nullable: true })
  eventLocation: string;

  @Column({ nullable: true })
  link: string;

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({ type: "simple-json", nullable: true })
  mediaUrls: { url: string; type: "image" | "video"; name?: string }[];

  @Column({ type: "simple-array", nullable: true })
  ccUserIds: string[];

  @Column({
    type: "enum",
    enum: AnnouncementStatus,
    default: AnnouncementStatus.SENT,
  })
  status: AnnouncementStatus;

  @Column({ type: "timestamp", nullable: true })
  scheduledAt: Date;

  @Column({ default: 0 })
  recipientCount: number;

  @Column({ type: "varchar", length: 26, nullable: true })
  createdById: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "createdById" })
  createdBy: Users;
}

export { Announcement as Announcements };
