import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ByteplusAdapter {
  private readonly logger = new Logger(ByteplusAdapter.name);
  private readonly baseUrl = "https://ark.ap-southeast.bytepluses.com";

  private getHeaders(): Record<string, string> {
    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
      throw new Error("Thiếu cấu hình ARK_API_KEY trong .env");
    }
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async createVideo(payload: Record<string, any>): Promise<any> {
    const res = await fetch(
      `${this.baseUrl}/api/v3/contents/generations/tasks`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`BytePlus create error: ${errText}`);
      throw new Error(`BytePlus API error (${res.status}): ${errText}`);
    }

    return res.json();
  }

  async getTaskResult(taskId: string): Promise<any> {
    const res = await fetch(
      `${this.baseUrl}/api/v3/contents/generations/tasks/${taskId}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`BytePlus get status error (${res.status}): ${errText}`);
    }

    return res.json();
  }

  async pollUntilDone(
    taskId: string,
    intervalMs = 5000,
    maxAttempts = 60,
  ): Promise<any> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const task = await this.getTaskResult(taskId);
        if (task.status === "succeeded") return task;
        if (task.status === "failed") {
          throw new Error(task.error?.message || "Task BytePlus failed");
        }
      } catch (err: any) {
        if (attempt === maxAttempts) throw err;
      }
    }
    throw new Error(`BytePlus task ${taskId} timeout`);
  }
}
