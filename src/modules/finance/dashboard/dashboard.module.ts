import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Contract } from "@modules/finance/entities/contract.entity";
import { PaymentDashboardService } from "./services/payment-dashboard.service";
import { PaymentDashboardController } from "./controllers/payment-dashboard.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Contract])],
  controllers: [PaymentDashboardController],
  providers: [PaymentDashboardService],
  exports: [PaymentDashboardService],
})
export class PaymentDashboardSubModule {}
