import { Module } from "@nestjs/common";
import { AuthCoreModule } from "../../core/auth/auth-core.module";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [AuthCoreModule, AuthModule, UserModule],
  exports: [AuthModule, UserModule],
})
export class IdentityModule {}
