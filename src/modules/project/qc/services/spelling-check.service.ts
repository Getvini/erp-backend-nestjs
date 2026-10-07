import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

export async function fetchRemoteFile(fileUrl: string): Promise<Buffer> {
  let fileRes: Response;
  try {
    fileRes = await fetch(fileUrl, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch file: ${fileRes.status}`);
    }
  } catch (_e) {
    throw new BadRequestException(
      "Không thể tải file từ link, vui lòng kiểm tra lại đường dẫn hoặc quyền chia sẻ",
    );
  }

  const contentType = String(fileRes.headers.get("content-type") || "");
  if (contentType.includes("text/html")) {
    throw new BadRequestException(
      "Không thể tải file từ link. Với Google Sheets, hãy bật chia sẻ 'Bất kỳ ai có đường liên kết' rồi thử lại",
    );
  }
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

@Injectable()
export class SpellingCheckService {
  async listSheets(fileBuffer: Buffer, fileName: string) {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(fileBuffer)]), fileName);
    const res = await fetch(`${AI_SERVICE_URL}/check/sheets`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return res.json();
  }

  async listSheetsFromUrl(fileUrl: string, fileName: string) {
    const buffer = await fetchRemoteFile(fileUrl);
    return this.listSheets(buffer, fileName);
  }

  async start(
    fileBuffer: Buffer,
    fileName: string,
    lang: string,
    sheetNames?: string,
    whitelist?: string,
    scenarioIds?: string,
    regions?: string,
  ) {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(fileBuffer)]), fileName);
    formData.append("lang", lang || "both");
    if (sheetNames) formData.append("sheet_names", sheetNames);
    if (whitelist) formData.append("whitelist", whitelist);
    if (scenarioIds !== undefined) {
      formData.append("scenario_scope", "explicit");
      if (scenarioIds) formData.append("scenario_ids", scenarioIds);
    }
    if (regions) formData.append("regions", regions);

    const res = await fetch(`${AI_SERVICE_URL}/check/start`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return res.json();
  }

  async startFromUrl(
    fileUrl: string,
    fileName: string,
    lang: string,
    sheetNames?: string,
    whitelist?: string,
    scenarioIds?: string,
    regions?: string,
  ) {
    const buffer = await fetchRemoteFile(fileUrl);
    return this.start(
      buffer,
      fileName,
      lang,
      sheetNames,
      whitelist,
      scenarioIds,
      regions,
    );
  }

  async getStatus(jobId: string) {
    const res = await fetch(`${AI_SERVICE_URL}/check/${jobId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) {
      throw new NotFoundException("Không tìm thấy tác vụ kiểm tra chính tả");
    }
    if (!res.ok) {
      throw new BadRequestException(`Lỗi từ AI service: ${res.statusText}`);
    }
    return res.json();
  }

  async getPdfStream(jobId: string) {
    const res = await fetch(`${AI_SERVICE_URL}/check/${jobId}/pdf`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new BadRequestException("Không thể tải PDF từ AI service");
    }
    return res.body;
  }

  async delete(jobId: string) {
    const res = await fetch(`${AI_SERVICE_URL}/check/${jobId}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) return { deleted: jobId };
    return res.json();
  }
}
