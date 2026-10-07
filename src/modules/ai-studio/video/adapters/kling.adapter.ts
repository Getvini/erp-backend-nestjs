import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class KlingAdapter {
  private readonly logger = new Logger(KlingAdapter.name);
  private readonly baseUrl = "https://api-singapore.klingai.com";

  private getHeaders(): Record<string, string> {
    const apiKey = process.env.KLING_API_KEY;
    if (!apiKey) {
      throw new Error("Thiếu cấu hình KLING_API_KEY trong .env");
    }
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers as Record<string, string>),
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      this.logger.error(`Kling HTTP error ${res.status}: ${errBody}`);
      throw new Error(`Kling API error (${res.status}): ${errBody}`);
    }

    return (await res.json()) as T;
  }

  async createImageToVideo(payload: Record<string, any>): Promise<any> {
    return this.request("/v1/videos/image2video", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getTaskStatus(taskId: string): Promise<any> {
    return this.request(`/v1/videos/image2video/${taskId}`, { method: "GET" });
  }

  async createMotionControl(payload: Record<string, any>): Promise<any> {
    return this.request("/v1/videos/motion-control", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getMotionControlTaskStatus(taskId: string): Promise<any> {
    return this.request(`/v1/videos/motion-control/${taskId}`, {
      method: "GET",
    });
  }

  async createElement(payload: Record<string, any>): Promise<any> {
    return this.request("/v1/elements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getElementTaskStatus(taskId: string): Promise<any> {
    return this.request(`/v1/elements/${taskId}`, { method: "GET" });
  }

  async deleteElement(elementId: string): Promise<any> {
    return this.request(`/v1/elements/${elementId}`, { method: "DELETE" });
  }

  async pollUntilDone(
    taskId: string,
    isMotionControl = false,
    intervalMs = 5000,
    maxAttempts = 60,
  ): Promise<any> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const res = isMotionControl
          ? await this.getMotionControlTaskStatus(taskId)
          : await this.getTaskStatus(taskId);

        const task = res?.data;
        if (task?.task_status === "succeed") return task;
        if (task?.task_status === "failed") {
          throw new Error(task.task_status_msg || "Task thất bại trên Kling");
        }
      } catch (err: any) {
        if (attempt === maxAttempts) throw err;
      }
    }
    throw new Error(`Polling task ${taskId} timeout`);
  }

  async pollElementUntilDone(
    taskId: string,
    intervalMs = 5000,
    maxAttempts = 30,
  ): Promise<any> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const res = await this.getElementTaskStatus(taskId);
      const task = res?.data;
      if (task?.task_status === "succeed") return task;
      if (task?.task_status === "failed") {
        throw new Error(task.task_status_msg || "Element creation failed");
      }
    }
    throw new Error(`Element polling task ${taskId} timeout`);
  }
}
