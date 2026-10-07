import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Debts } from "@modules/finance/entities/debt.entity";
import { DebtPayments } from "@modules/finance/entities/debt-payment.entity";
import { PaymentMilestone } from "@modules/finance/contract/entities/payment-milestone.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { DebtService } from "./services/debt.service";
import { DebtPaymentService } from "./services/debt-payment.service";
import { DebtController } from "./controllers/debt.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Debts, DebtPayments, PaymentMilestone, Contract]),
  ],
  controllers: [DebtController],
  providers: [DebtService, DebtPaymentService],
  exports: [DebtService, DebtPaymentService],
})
export class DebtSubModule {}
