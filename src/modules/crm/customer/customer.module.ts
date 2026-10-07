import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customers } from "./entities/customer.entity";
import { ReferralPartners } from "@modules/crm/service/entities/referral-partner.entity";
import { CustomerController } from "./controllers/customer.controller";
import { CustomerQueryService } from "./services/customer-query.service";
import { CustomerActionService } from "./services/customer-action.service";
import { TaxVerificationService } from "./services/tax-verification.service";

@Module({
  imports: [TypeOrmModule.forFeature([Customers, ReferralPartners])],
  controllers: [CustomerController],
  providers: [
    CustomerQueryService,
    CustomerActionService,
    TaxVerificationService,
  ],
  exports: [
    TypeOrmModule,
    CustomerQueryService,
    CustomerActionService,
    TaxVerificationService,
  ],
})
export class CustomerModule {}
