import * as dotenv from "dotenv";
import * as path from "path";

// Tải cấu hình môi trường test từ .env.test
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

import { ThrottlerGuard } from "@nestjs/throttler";

// Vô hiệu hóa rate-limit throttling trong môi trường test tự động để tránh HTTP 429
jest.spyOn(ThrottlerGuard.prototype, "canActivate").mockImplementation(() => Promise.resolve(true));

