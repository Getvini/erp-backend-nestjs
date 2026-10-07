import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CloudinaryService } from "../services/cloudinary.service";

@ApiTags("Infrastructure - Storage")
@ApiBearerAuth()
@Controller("cloudinary")
export class CloudinaryController {
  constructor(private readonly service: CloudinaryService) {}

  @Get("signature")
  @ApiOperation({
    summary: "Lấy chữ ký bảo mật để tải ảnh/file trực tiếp lên Cloudinary",
  })
  getSignature(@Query("folder") folder?: string) {
    return this.service.getSignature(folder);
  }
}
