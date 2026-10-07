import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VinicoinTransactions } from "./entities/vinicoin-transaction.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { VinicoinService } from "./services/vinicoin.service";
import { VinicoinController } from "./controllers/vinicoin.controller";

@Module({
  imports: [TypeOrmModule.forFeature([VinicoinTransactions, Accounts])],
  controllers: [VinicoinController],
  providers: [VinicoinService],
  exports: [VinicoinService],
})
export class RewardModule {}
