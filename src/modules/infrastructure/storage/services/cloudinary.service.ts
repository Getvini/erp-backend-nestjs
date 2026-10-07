import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  getCloudinaryFolder,
  signCloudinaryRequest,
} from "../helpers/cloudinary-sign.helper";

@Injectable()
export class CloudinaryService {
  getSignature(folderParam?: string) {
    const folder = getCloudinaryFolder(folderParam);
    const timestamp = Math.round(new Date().getTime() / 1000);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        "Cấu hình Cloudinary trên server không hợp lệ (thiếu environment keys).",
      );
    }

    const signature = signCloudinaryRequest({ timestamp, folder }, apiSecret);

    return {
      signature,
      timestamp,
      cloud_name: cloudName,
      api_key: apiKey,
      cloudName,
      apiKey,
      folder,
    };
  }
}
