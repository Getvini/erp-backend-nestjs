import { Injectable, BadRequestException } from "@nestjs/common";
import { ProjectProductDescriptionService } from "./project-product-description.service";
import { ProjectProductDescriptionStatus } from "../enums/qc.enum";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

type Actor = { id: string; userId?: string; role: string; username?: string };

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<(li|p|br|div|\/p|\/li|\/div)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

@Injectable()
export class QcScanService {
  constructor(
    private readonly productDescriptionService: ProjectProductDescriptionService,
  ) {}

  async getApprovedProductInfo(projectId: string, actor?: Actor) {
    const submissions = await this.productDescriptionService.getByProject(
      projectId,
      actor,
    );
    const approved = submissions.find(
      (sub) => sub.status === ProjectProductDescriptionStatus.APPROVED,
    );

    if (!approved) {
      throw new BadRequestException(
        "Dự án chưa có thông tin chuẩn sản phẩm được duyệt, không thể chạy QC",
      );
    }

    return approved.items.map((item) => ({
      productName: item.productName,
      extractedText: item.extractedText,
      note: item.note,
      fileUrl: item.fileUrl,
    }));
  }

  async run(params: {
    fileBuffer: Buffer;
    fileName?: string;
    sheetNames: string[];
    projectId: string;
    scenarioIds?: string[];
    regions?: any[];
    actor?: Actor;
  }) {
    const productInfo = await this.getApprovedProductInfo(
      params.projectId,
      params.actor,
    );
    const aiProductInfo = productInfo.map((item) => ({
      productName: item.productName,
      content: stripHtml(item.extractedText || ""),
      note: item.note,
    }));

    const sheetNames = params.sheetNames.filter(Boolean);
    if (sheetNames.length === 0) {
      throw new BadRequestException("Vui lòng chọn ít nhất 1 sheet để chạy QC");
    }

    const sheetResults = await Promise.all(
      sheetNames.map(async (sheetName) => {
        const formData = new FormData();
        formData.append(
          "file",
          new Blob([new Uint8Array(params.fileBuffer)]),
          params.fileName || "result",
        );
        formData.append("sheet_name", sheetName);
        formData.append("product_info", JSON.stringify(aiProductInfo));

        const submitRes = await fetch(`${AI_SERVICE_URL}/qc/run`, {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const data = await submitRes.json();
        return { sheetName, data };
      }),
    );

    const mismatches = sheetResults.flatMap(({ sheetName, data }) =>
      (data?.mismatch_report?.mismatches || []).map((m: any) => ({
        ...m,
        sheet_name: sheetName,
      })),
    );

    const contentBlocks: Record<string, any> = {};
    for (const { sheetName, data } of sheetResults) {
      contentBlocks[sheetName] = data?.content_blocks;
    }

    return {
      sheets: sheetNames,
      content_blocks: contentBlocks,
      batches: [],
      mismatch_report: { mismatches },
      models: sheetResults[0]?.data?.models,
    };
  }
}
