import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserController } from "./controllers/user.controller";
import { ProfileController } from "./controllers/profile.controller";
import { UserQueryService } from "./services/user-query.service";
import { UserManagementService } from "./services/user-management.service";
import { ProfileService } from "./services/profile.service";
import { Users } from "./entities/user.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Users, Accounts])],
  controllers: [UserController, ProfileController],
  providers: [UserQueryService, UserManagementService, ProfileService],
  exports: [
    UserQueryService,
    UserManagementService,
    ProfileService,
    TypeOrmModule,
  ],
})
export class UserModule {}
