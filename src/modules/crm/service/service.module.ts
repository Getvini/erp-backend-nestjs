import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Services } from "./entities/service.entity";
import { ServiceJob } from "./entities/service-job.entity";
import { Jobs } from "./entities/job.entity";
import { ServicePackages } from "./entities/service-package.entity";
import { ServicePackageItems } from "./entities/service-package-item.entity";
import { ReferralPartners } from "./entities/referral-partner.entity";
import { ServiceController } from "./controllers/service.controller";
import { ServicePackageController } from "./controllers/service-package.controller";
import { ReferralPartnerController } from "./controllers/referral-partner.controller";
import { JobController } from "./controllers/job.controller";
import { ServiceService } from "./services/service.service";
import { ServicePackageService } from "./services/service-package.service";
import { ReferralPartnerService } from "./services/referral-partner.service";
import { JobService } from "./services/job.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Services,
      ServiceJob,
      Jobs,
      ServicePackages,
      ServicePackageItems,
      ReferralPartners,
    ]),
  ],
  controllers: [
    ServiceController,
    ServicePackageController,
    ReferralPartnerController,
    JobController,
  ],
  providers: [
    ServiceService,
    ServicePackageService,
    ReferralPartnerService,
    JobService,
  ],
  exports: [
    TypeOrmModule,
    ServiceService,
    ServicePackageService,
    ReferralPartnerService,
    JobService,
  ],
})
export class ServiceSubModule {}
