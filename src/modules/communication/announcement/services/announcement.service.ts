import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  Announcement,
  AnnouncementStatus,
} from "../entities/announcement.entity";
import { AnnouncementRecipient } from "../entities/announcement-recipient.entity";
import { AnnouncementComment } from "../entities/announcement-comment.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { TeamMember } from "@modules/project/project-core/entities/team-member.entity";
import { resolveAnnouncementRecipients } from "../helpers/announcement-resolver.helper";
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from "../dto/announcement.dto";

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
    @InjectRepository(AnnouncementRecipient)
    private readonly recipientRepo: Repository<AnnouncementRecipient>,
    @InjectRepository(AnnouncementComment)
    private readonly commentRepo: Repository<AnnouncementComment>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: CreateAnnouncementDto, createdById: string) {
    if (
      data.eventStartAt &&
      data.eventEndAt &&
      new Date(data.eventEndAt) < new Date(data.eventStartAt)
    ) {
      throw new BadRequestException(
        "Ngày kết thúc không được trước ngày bắt đầu",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const status = data.status || AnnouncementStatus.SENT;
      const announcement = manager.create(Announcement, {
        ...data,
        status,
        eventStartAt: data.eventStartAt
          ? new Date(data.eventStartAt)
          : undefined,
        eventEndAt: data.eventEndAt ? new Date(data.eventEndAt) : undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        createdById,
      });
      const saved = await manager.save(announcement);

      if (status === AnnouncementStatus.SENT) {
        const recipients = await resolveAnnouncementRecipients(
          data,
          this.userRepo,
          this.teamMemberRepo,
          createdById,
        );
        if (recipients.length > 0) {
          const recEntries = recipients.map((u) =>
            manager.create(AnnouncementRecipient, {
              announcementId: saved.id,
              recipientId: u.id,
              isRead: false,
            }),
          );
          await manager.save(recEntries);
          saved.recipientCount = recipients.length;
          await manager.save(saved);
        }
      }
      return saved;
    });
  }

  async update(id: string, data: UpdateAnnouncementDto) {
    const announcement = await this.repo.findOne({ where: { id } });
    if (!announcement) throw new NotFoundException("Không tìm thấy thông báo");

    Object.assign(announcement, {
      ...data,
      eventStartAt: data.eventStartAt
        ? new Date(data.eventStartAt)
        : announcement.eventStartAt,
      eventEndAt: data.eventEndAt
        ? new Date(data.eventEndAt)
        : announcement.eventEndAt,
      scheduledAt: data.scheduledAt
        ? new Date(data.scheduledAt)
        : announcement.scheduledAt,
    });
    return this.repo.save(announcement);
  }

  async delete(id: string) {
    const announcement = await this.repo.findOne({ where: { id } });
    if (!announcement) throw new NotFoundException("Không tìm thấy thông báo");
    return this.repo.remove(announcement);
  }

  async getAll(user: any) {
    const userId = user?.userId || user?.id;
    const announcements = await this.repo.find({
      order: { createdAt: "DESC" },
      relations: ["createdBy"],
    });

    const enriched = await Promise.all(
      announcements.map(async (a) => {
        const recipient = await this.recipientRepo.findOne({
          where: { announcementId: a.id, recipientId: userId },
        });
        const readCount = await this.recipientRepo.count({
          where: { announcementId: a.id, isRead: true },
        });
        return {
          ...a,
          isRead: recipient ? recipient.isRead : a.createdById === userId,
          readCount,
        };
      }),
    );
    return enriched;
  }

  async getOne(id: string, userId: string) {
    const announcement = await this.repo.findOne({
      where: { id },
      relations: ["createdBy"],
    });
    if (!announcement) throw new NotFoundException("Không tìm thấy thông báo");

    const recipient = await this.recipientRepo.findOne({
      where: { announcementId: id, recipientId: userId },
    });
    if (recipient && !recipient.isRead) {
      recipient.isRead = true;
      recipient.readAt = new Date();
      recipient.lastViewedAt = new Date();
      await this.recipientRepo.save(recipient);
    }
    const readCount = await this.recipientRepo.count({
      where: { announcementId: id, isRead: true },
    });
    return {
      ...announcement,
      isRead: recipient
        ? recipient.isRead
        : announcement.createdById === userId,
      readCount,
    };
  }

  async markAsRead(id: string, userId: string) {
    const recipient = await this.recipientRepo.findOne({
      where: { announcementId: id, recipientId: userId },
    });
    if (recipient) {
      recipient.isRead = true;
      recipient.readAt = new Date();
      await this.recipientRepo.save(recipient);
    }
    return { success: true };
  }

  async addComment(id: string, authorId: string, content: string) {
    const announcement = await this.repo.findOne({ where: { id } });
    if (!announcement) throw new NotFoundException("Không tìm thấy thông báo");

    const comment = this.commentRepo.create({
      announcementId: id,
      authorId,
      content,
    });
    await this.commentRepo.save(comment);
    return this.commentRepo.findOne({
      where: { id: comment.id },
      relations: ["author"],
    });
  }

  async getComments(id: string) {
    return this.commentRepo.find({
      where: { announcementId: id },
      relations: ["author"],
      order: { createdAt: "ASC" },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException("Không tìm thấy bình luận");
    if (comment.authorId !== userId) {
      throw new ForbiddenException("Không có quyền xóa bình luận này");
    }
    return this.commentRepo.remove(comment);
  }
}
