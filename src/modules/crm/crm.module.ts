import { Module } from "@nestjs/common";
import { CustomerModule } from "./customer/customer.module";
import { OpportunityModule } from "./opportunity/opportunity.module";
import { QuotationModule } from "./quotation/quotation.module";
import { ServiceSubModule } from "./service/service.module";
import { VendorModule } from "./vendor/vendor.module";

@Module({
  imports: [
    CustomerModule,
    OpportunityModule,
    QuotationModule,
    ServiceSubModule,
    VendorModule,
  ],
  exports: [
    CustomerModule,
    OpportunityModule,
    QuotationModule,
    ServiceSubModule,
    VendorModule,
  ],
})
export class CrmModule {}
