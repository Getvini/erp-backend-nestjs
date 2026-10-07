import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Project } from "../project-core/entities/project.entity";
import { Tasks } from "../task/entities/task.entity";
import { Users } from "../../identity/user/entities/user.entity";
import { Contract } from "../../finance/entities/contract.entity";
import { Customers } from "../../crm/customer/entities/customer.entity";
import { Debts } from "../../finance/entities/debt.entity";
import { DebtPayments } from "../../finance/entities/debt-payment.entity";
import { Opportunities } from "../../crm/opportunity/entities/opportunity.entity";
import { Quotations } from "../../crm/quotation/entities/quotation.entity";
import { ContractServices } from "../acceptance/entities/contract-service.entity";
import { Violations } from "../task/entities/violation.entity";
import { TaskModule } from "../task/task.module";

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
