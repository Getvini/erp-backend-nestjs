import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AcceptanceRequests } from "./entities/acceptance-request.entity";
import { ContractServices } from "./entities/contract-service.entity";
import { Tasks } from "../task/entities/task.entity";
import { Project } from "../project-core/entities/project.entity";
import { Contract } from "../../finance/entities/contract.entity";
import { Users } from "../../identity/user/entities/user.entity";
import { Accounts } from "../../identity/auth/entities/account.entity";
import { VinicoinTransactions } from "../reward/entities/vinicoin-transaction.entity";
import { CommunicationModule } from "../../communication/communication.module";
import { VinicoinService } from "../reward/services/vinicoin.service";
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
