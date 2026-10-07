import { Module } from "@nestjs/common";
import { ContractSubModule } from "./contract/contract.module";
import { PaymentMilestoneSubModule } from "./milestone/milestone.module";
import { DebtSubModule } from "./debt/debt.module";
import { PaymentRequestSubModule } from "./payment-request/payment-request.module";
import { FinanceDocumentSubModule } from "./document/document.module";
import { DocumentLibrarySubModule } from "./document-library/document-library.module";
import { PaymentDashboardSubModule } from "./dashboard/dashboard.module";

@Module({
  imports: [
    ContractSubModule,
    PaymentMilestoneSubModule,
    DebtSubModule,
    PaymentRequestSubModule,
    FinanceDocumentSubModule,
    DocumentLibrarySubModule,
    PaymentDashboardSubModule,
  ],
  exports: [
    ContractSubModule,
    PaymentMilestoneSubModule,
    DebtSubModule,
    PaymentRequestSubModule,
    FinanceDocumentSubModule,
    DocumentLibrarySubModule,
    PaymentDashboardSubModule,
  ],
})
export class FinanceModule {}
