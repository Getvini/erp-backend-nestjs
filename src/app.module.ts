import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { appConfig } from "./core/config/app.config";
import { envValidationSchema } from "./core/config/env.validation";
import { DatabaseModule } from "./core/database/database.module";
import { AuthCoreModule } from "./core/auth/auth-core.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { CrmModule } from "./modules/crm/crm.module";
import { ProjectManagementModule } from "./modules/project-management/project-management.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { CommunicationModule } from "./modules/communication/communication.module";
import { AiStudioModule } from "./modules/ai-studio/ai-studio.module";

@Module({
  imports: [
    // 1. Cấu hình biến môi trường type-safe fail-fast
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: envValidationSchema,
    }),

    // 2. Event Emitter xử lý bất đồng bộ liên module
    EventEmitterModule.forRoot(),

    // 3. Cơ sở dữ liệu TypeORM
    DatabaseModule,

    // 4. Bảo mật Core
    AuthCoreModule,

    // 5. 6 Bounded Contexts
    IdentityModule,
    CrmModule,
    ProjectManagementModule,
    FinanceModule,
    CommunicationModule,
    AiStudioModule,
  ],
})
export class AppModule {}
