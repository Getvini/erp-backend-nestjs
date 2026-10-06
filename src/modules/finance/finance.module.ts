import { Module } from "@nestjs/common";
import { ContractController } from "./controllers/contract.controller";
import { ContractQueryService } from "./services/contract-query.service";

@Module({
  controllers: [ContractController],
  providers: [ContractQueryService],
  exports: [ContractQueryService],
})
export class FinanceModule {}
