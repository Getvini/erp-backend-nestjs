import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Opportunities } from "./entities/opportunity.entity";
import { OpportunityPackages } from "./entities/opportunity-package.entity";
import { OpportunityServices } from "./entities/opportunity-service.entity";
import { OpportunityServiceJobs } from "./entities/opportunity-service-job.entity";
import { OpportunityRejections } from "./entities/opportunity-rejection.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { Jobs } from "@modules/crm/service/entities/job.entity";
import { CustomerModule } from "@modules/crm/customer/customer.module";
import { OpportunityController } from "./controllers/opportunity.controller";
import { OpportunityServiceController } from "./controllers/opportunity-service.controller";
import { OpportunityQueryService } from "./services/opportunity-query.service";
import { OpportunityLifecycleService } from "./services/opportunity-lifecycle.service";
import { OpportunityServiceService } from "./services/opportunity-service.service";
import { OpportunitySyncHelper } from "./helpers/opportunity-sync.helper";
import { Quotations } from "@modules/crm/quotation/entities/quotation.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Opportunities,
      OpportunityPackages,
      OpportunityServices,
      OpportunityServiceJobs,
      OpportunityRejections,
      Quotations,
      Services,
      Jobs,
    ]),
    CustomerModule,
  ],
  controllers: [OpportunityController, OpportunityServiceController],
  providers: [
    OpportunityQueryService,
    OpportunityLifecycleService,
    OpportunityServiceService,
    OpportunitySyncHelper,
  ],
  exports: [
    TypeOrmModule,
    OpportunityQueryService,
    OpportunityLifecycleService,
    OpportunityServiceService,
    OpportunitySyncHelper,
  ],
})
export class OpportunityModule {}
