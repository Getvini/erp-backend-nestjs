import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentRequests } from "./entities/payment-request.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { PaymentRequestQueryService } from "./services/payment-request-query.service";
import { PaymentRequestActionService } from "./services/payment-request-action.service";
import { PaymentRequestWorkflowService } from "./services/payment-request-workflow.service";
import { PaymentRequestController } from "./controllers/payment-request.controller";

@Module({
  imports: [TypeOrmModule.forFeature([PaymentRequests, Tasks, Users])],
  controllers: [PaymentRequestController],
  providers: [
    PaymentRequestQueryService,
    PaymentRequestActionService,
    PaymentRequestWorkflowService,
  ],
  exports: [
    PaymentRequestQueryService,
    PaymentRequestActionService,
    PaymentRequestWorkflowService,
  ],
})
export class PaymentRequestSubModule {}
