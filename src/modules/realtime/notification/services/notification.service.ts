import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { Notification } from "../entities/notification.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import {
  NotificationEmitterService,
  GLOBAL_NOTIFICATION_CHANNEL,
} from "./notification-emitter.service";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly emitter: NotificationEmitterService,
  ) {}

  async getMyNotifications(userId: string) {
    return this.repo.find({
      where: { recipientId: userId },
      order: { createdAt: "DESC" },
    });
  }

  async markAsRead(id: string) {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException("Không tìm thấy thông báo");
    }
    notification.isRead = true;
    notification.readAt = new Date();
    return this.repo.save(notification);
  }

  async create(data: any, manager?: EntityManager) {
    return this.createNotification(data, manager);
  }

  async createNotification(
    data: {
      title: string;
      content: string;
      type?: string;
      recipient?: Users | { id: string };
      sender?: Users | { id: string };
      link?: string;
      relatedEntityId?: string;
      relatedEntityType?: string;
      [key: string]: any;
    },
    manager?: EntityManager,
  ) {
    if (!data.recipient?.id) {
      return null;
    }

    const repository = manager
      ? manager.getRepository(Notification)
      : this.repo;

    const noti = repository.create({
      title: data.title,
      content: data.content,
      type: data.type || "SYSTEM",
      recipientId: data.recipient.id,
      senderId: data.sender?.id || null,
      link: data.link || null,
      relatedEntityId: data.relatedEntityId || null,
      relatedEntityType: data.relatedEntityType || null,
      isRead: false,
    });

    const saved = await repository.save(noti);

    // Bắn realtime qua SSE cho người nhận
    this.emitter.sendToUser(
      GLOBAL_NOTIFICATION_CHANNEL,
      data.recipient.id,
      saved,
    );

    return saved;
  }
}
