import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentMilestone } from "@modules/finance/contract/entities/payment-milestone.entity";
import { Debts } from "@modules/finance/entities/debt.entity";
import { DebtPayments } from "@modules/finance/entities/debt-payment.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { PaymentMilestoneService } from "./services/milestone.service";
import { PaymentMilestoneController } from "./controllers/milestone.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMilestone, Debts, DebtPayments, Contract]),
  ],
  controllers: [PaymentMilestoneController],
  providers: [PaymentMilestoneService],
  exports: [PaymentMilestoneService],
})
export class PaymentMilestoneSubModule {}
