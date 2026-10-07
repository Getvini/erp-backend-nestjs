import { Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class ChatBotService {
  async sendMessage(
    message: string,
    userId: string,
    fullName: string,
    token?: string,
    sessionId?: string,
  ) {
    const n8nUrl = process.env.N8N_URL;
    if (!n8nUrl) {
      throw new BadRequestException("N8N_URL chưa được cấu hình.");
    }

    try {
      const response = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatInput: message,
          userId,
          userFullName: fullName,
          sessionId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      throw new BadRequestException(
        "Không thể kết nối với Chatbot. Vui lòng thử lại sau.",
      );
    }
  }
}
