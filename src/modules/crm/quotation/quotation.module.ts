import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Quotations } from "./entities/quotation.entity";
import { QuotationDetails } from "./entities/quotation-detail.entity";
import { QuotationController } from "./controllers/quotation.controller";
import { QuotationQueryService } from "./services/quotation-query.service";
import { QuotationActionService } from "./services/quotation-action.service";

@Module({
  imports: [TypeOrmModule.forFeature([Quotations, QuotationDetails])],
  controllers: [QuotationController],
  providers: [QuotationQueryService, QuotationActionService],
  exports: [TypeOrmModule, QuotationQueryService, QuotationActionService],
})
export class QuotationModule {}
