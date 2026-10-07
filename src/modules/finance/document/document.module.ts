import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AcceptanceMinutes } from "./entities/acceptance-minute.entity";
import { VatInvoices } from "./entities/vat-invoice.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { FinanceDocumentService } from "./services/finance-document.service";
import { FinanceDocumentController } from "./controllers/finance-document.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([AcceptanceMinutes, VatInvoices, Contract]),
  ],
  controllers: [FinanceDocumentController],
  providers: [FinanceDocumentService],
  exports: [FinanceDocumentService],
})
export class FinanceDocumentSubModule {}
