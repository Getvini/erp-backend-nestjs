import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe, VersioningType, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import * as compression from "compression";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./core/filters/all-exceptions.filter";
import { TransformInterceptor } from "./core/interceptors/transform.interceptor";
import { LoggingInterceptor } from "./core/interceptors/logging.interceptor";
import { JwtAuthGuard } from "./core/guards/jwt-auth.guard";
import { RolesGuard } from "./core/guards/roles.guard";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // 1. Bảo mật HTTP Headers, Nén dữ liệu & Cookie parser
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // 2. Cấu hình CORS đa nguồn (Web erp-UI + Mobile erp-mobile)
  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (như curl hoặc mobile apps) và localhost/domain dev
      callback(null, true);
    },
    credentials: true,
  });

  // 3. Backward-compatible rewrite & Versioning: /api/v1/...
  app.use((req: any, res: any, next: any) => {
    if (req.url.startsWith("/api/") && !req.url.startsWith("/api/v1/")) {
      req.url = req.url.replace(/^\/api\//, "/api/v1/");
    }
    next();
  });

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  // 4. Global ValidationPipe (whitelist: true lọc an toàn, không ném lỗi 400 nếu FE gửi thêm trường phụ)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 5. Chuẩn hóa lỗi & Chuẩn hóa dữ liệu trả về
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // 6. Kích hoạt bảo vệ RBAC toàn app (mặc định cần login trừ khi có @Public())
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // 7. Khởi tạo tài liệu API Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle("ERP Enterprise API (NestJS)")
    .setDescription(
      "Tài liệu API Backend NestJS cho Web Portal (erp-UI) và Mobile App (erp-mobile)",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  // 8. Graceful Shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(
    `================================================================`,
  );
  logger.log(
    `🚀 ERP NestJS Server is running on: http://localhost:${port}/api/v1`,
  );
  logger.log(
    `📑 Swagger Documentation available at: http://localhost:${port}/api/docs`,
  );
  logger.log(
    `================================================================`,
  );
}

bootstrap();
