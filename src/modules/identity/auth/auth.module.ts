import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthCoreModule } from "@core/auth/auth-core.module";
import { AuthController } from "./controllers/auth.controller";
import { AccountController } from "./controllers/account.controller";
import { AuthService } from "./services/auth.service";
import { AccountService } from "./services/account.service";
import { Accounts } from "./entities/account.entity";
import { RefreshSessions } from "./entities/refresh-session.entity";
import { Users } from "@modules/identity/user/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Accounts, RefreshSessions, Users]),
    AuthCoreModule,
  ],
  controllers: [AuthController, AccountController],
  providers: [AuthService, AccountService],
  exports: [AuthService, AccountService, TypeOrmModule],
})
export class AuthModule {}
