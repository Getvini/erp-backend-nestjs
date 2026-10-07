import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AcceptanceRequests } from "./entities/acceptance-request.entity";
import { ContractServices } from "./entities/contract-service.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { VinicoinTransactions } from "@modules/project/reward/entities/vinicoin-transaction.entity";
import { CommunicationModule } from "@modules/communication/communication.module";
import { VinicoinService } from "@modules/project/reward/services/vinicoin.service";
import { AcceptanceRewardService } from "./services/acceptance-reward.service";
import { AcceptanceQueryService } from "./services/acceptance-query.service";
import { AcceptanceCreateService } from "./services/acceptance-create.service";
import { AcceptanceDecisionService } from "./services/acceptance-decision.service";
import { AcceptanceProcessService } from "./services/acceptance-process.service";
import { AcceptanceService } from "./services/acceptance.service";
import { AcceptanceController } from "./controllers/acceptance.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcceptanceRequests,
      ContractServices,
      Tasks,
      Project,
      Contract,
      Users,
      Accounts,
      VinicoinTransactions,
    ]),
    CommunicationModule,
  ],
  controllers: [AcceptanceController],
  providers: [
    VinicoinService,
    AcceptanceRewardService,
    AcceptanceQueryService,
    AcceptanceCreateService,
    AcceptanceDecisionService,
    AcceptanceProcessService,
    AcceptanceService,
  ],
  exports: [
    AcceptanceService,
    AcceptanceQueryService,
    AcceptanceRewardService,
    AcceptanceCreateService,
  ],
})
export class AcceptanceModule {}
