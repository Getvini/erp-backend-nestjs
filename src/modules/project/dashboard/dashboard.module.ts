import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { Customers } from "@modules/crm/customer/entities/customer.entity";
import { Debts } from "@modules/finance/entities/debt.entity";
import { DebtPayments } from "@modules/finance/entities/debt-payment.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { Quotations } from "@modules/crm/quotation/entities/quotation.entity";
import { ContractServices } from "@modules/project/acceptance/entities/contract-service.entity";
import { Violations } from "@modules/project/task/entities/violation.entity";
import { TaskModule } from "@modules/project/task/task.module";

import { DashboardScopeService } from "./services/dashboard-scope.service";
import { DashboardAdminService } from "./services/dashboard-admin.service";
import { DashboardSaleService } from "./services/dashboard-sale.service";
import { DashboardMemberService } from "./services/dashboard-member.service";
import { DashboardProjectService } from "./services/dashboard-project.service";
import { DashboardMemberPayloadService } from "./services/dashboard-member-payload.service";
import { DashboardService } from "./services/dashboard.service";
import { DashboardController } from "./controllers/dashboard.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Tasks,
      Users,
      Contract,
      Customers,
      Debts,
      DebtPayments,
      Opportunities,
      Quotations,
      ContractServices,
      Violations,
    ]),
    TaskModule,
  ],
  controllers: [DashboardController],
  providers: [
    DashboardScopeService,
    DashboardAdminService,
    DashboardSaleService,
    DashboardMemberService,
    DashboardProjectService,
    DashboardMemberPayloadService,
    DashboardService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
