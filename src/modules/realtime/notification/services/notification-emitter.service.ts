import { Injectable } from "@nestjs/common";
import { Response } from "express";

export const GLOBAL_NOTIFICATION_CHANNEL = "global_notifications";

@Injectable()
export class NotificationEmitterService {
  private connections = new Map<string, Map<string, Set<Response>>>();

  addConnection(channel: string, userId: string, res: Response) {
    if (!this.connections.has(channel)) {
      this.connections.set(channel, new Map());
    }
    const channelMap = this.connections.get(channel)!;
    if (!channelMap.has(userId)) {
      channelMap.set(userId, new Set());
    }
    channelMap.get(userId)!.add(res);
  }

  removeConnection(channel: string, userId: string, res: Response) {
    const channelMap = this.connections.get(channel);
    if (!channelMap) return;
    const userSet = channelMap.get(userId);
    if (!userSet) return;
    userSet.delete(res);
    if (userSet.size === 0) {
      channelMap.delete(userId);
    }
  }

  sendToUser(channel: string, userId: string, data: any) {
    const channelMap = this.connections.get(channel);
    if (!channelMap) return;
    const userSet = channelMap.get(userId);
    if (!userSet) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    userSet.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        // Connection already dead
      }
    });
  }

  broadcast(channel: string, data: any) {
    const channelMap = this.connections.get(channel);
    if (!channelMap) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    channelMap.forEach((userSet) => {
      userSet.forEach((res) => {
        try {
          res.write(payload);
        } catch (err) {
          // Connection dead
        }
      });
    });
  }
}
