import { Injectable } from "@nestjs/common";
import { AcceptanceQueryService } from "./acceptance-query.service";
import { AcceptanceCreateService } from "./acceptance-create.service";
import { AcceptanceDecisionService } from "./acceptance-decision.service";
import { AcceptanceProcessService } from "./acceptance-process.service";
import {
  CreateAcceptanceDto,
  AcceptanceQueryDto,
  ProcessAcceptanceDecisionDto,
} from "../dto/acceptance.dto";
import { AcceptanceActor } from "../helpers/acceptance-validation.helper";

@Injectable()
export class AcceptanceService {
  constructor(
    private readonly queryService: AcceptanceQueryService,
    private readonly createService: AcceptanceCreateService,
    private readonly decisionService: AcceptanceDecisionService,
    private readonly processService: AcceptanceProcessService,
  ) {}

  async getAllRequests(filters: AcceptanceQueryDto) {
    return this.queryService.getAllRequests(filters);
  }

  async getRequest(id: string) {
    return this.queryService.getRequest(id);
  }

  async createRequest(data: CreateAcceptanceDto & { userId: string }) {
    return this.createService.createRequest(data);
  }

  async approveRequest(id: string, actor: AcceptanceActor, feedback?: string) {
    return this.decisionService.approveRequest(id, actor, feedback);
  }

  async rejectRequest(id: string, actor: AcceptanceActor, feedback: string) {
    return this.decisionService.rejectRequest(id, actor, feedback);
  }

  async processRequest(
    id: string,
    actor: AcceptanceActor,
    decisions: ProcessAcceptanceDecisionDto[],
  ) {
    return this.processService.processRequest(id, actor, decisions);
  }
}
