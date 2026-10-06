import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthCoreModule } from "../../../core/auth/auth-core.module";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { Accounts } from "./entities/account.entity";
import { RefreshSessions } from "./entities/refresh-session.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Accounts, RefreshSessions]),
    AuthCoreModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, TypeOrmModule],
})
export class AuthModule {}
