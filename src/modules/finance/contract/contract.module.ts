import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Contract } from "@modules/finance/entities/contract.entity";
import { Debts } from "@modules/finance/entities/debt.entity";
import { DebtPayments } from "@modules/finance/entities/debt-payment.entity";
import { PaymentMilestone } from "./entities/payment-milestone.entity";
import { ContractAddendum } from "./entities/contract-addendum.entity";
import { Customers } from "@modules/crm/customer/entities/customer.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { ContractServices } from "@modules/project/acceptance/entities/contract-service.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { ContractQueryService } from "./services/contract-query.service";
import { ContractActionService } from "./services/contract-action.service";
import { MilestoneService } from "./services/milestone.service";
import { ContractAddendumService } from "./services/contract-addendum.service";
import { ContractController } from "./controllers/contract.controller";
import { ContractAddendumController } from "./controllers/contract-addendum.controller";
import { DebtSubModule } from "@modules/finance/debt/debt.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contract,
      Debts,
      DebtPayments,
      PaymentMilestone,
      ContractAddendum,
      Customers,
      Opportunities,
      ContractServices,
      Services,
      Tasks,
      Users,
    ]),
    DebtSubModule,
  ],
  controllers: [ContractController, ContractAddendumController],
  providers: [
    ContractQueryService,
    ContractActionService,
    MilestoneService,
    ContractAddendumService,
  ],
  exports: [ContractQueryService, TypeOrmModule],
})
export class ContractSubModule {}
