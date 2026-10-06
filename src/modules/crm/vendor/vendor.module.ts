import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Vendors } from "./entities/vendor.entity";
import { VendorJobs } from "./entities/vendor-job.entity";
import { VendorController } from "./controllers/vendor.controller";
import { VendorService } from "./services/vendor.service";

@Module({
  imports: [TypeOrmModule.forFeature([Vendors, VendorJobs])],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
