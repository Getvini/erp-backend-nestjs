import { Injectable } from "@nestjs/common";

@Injectable()
export class AiAssetService {
  async getAllAssets(_user: any) {
    return {
      items: [
        {
          id: "asset-demo-1",
          name: "Banner Quảng Cáo AI 4K",
          provider: "KLING",
          model: "kling-v1",
          status: "COMPLETED",
          url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          createdAt: new Date(),
        },
      ],
      total: 1,
    };
  }
}
