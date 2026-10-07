import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

@Injectable()
export class NotificationService {
  async getMyNotifications(_user: any) {
    return {
      items: [
        {
          id: "noti-demo-1",
          title: "Chào mừng bạn đến với ERP NestJS",
          content: "Hệ thống Backend mới đã sẵn sàng vận hành.",
          isRead: false,
          createdAt: new Date(),
        },
      ],
      unreadCount: 1,
    };
  }

  async createNotification(
    data: {
      title: string;
      content: string;
      type: string;
      recipient?: any;
      sender?: any;
      link?: string;
      relatedEntityId?: string;
      relatedEntityType?: string;
    },
    _manager?: any,
  ) {
    // Event or log
    return {
      id: "noti-" + Date.now(),
      ...data,
      isRead: false,
      createdAt: new Date(),
    };
  }

  async create(data: any) {
    return this.createNotification(data);
  }

  // Lắng nghe sự kiện từ các module khác (Event-Driven)
  @OnEvent("project.created")
  handleProjectCreated(payload: any) {
    console.log(
      "[NotificationService] Đã nhận sự kiện project.created:",
      payload,
    );
  }
}
