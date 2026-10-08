import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, Repository } from "typeorm";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { OpportunityPackages } from "@modules/crm/opportunity/entities/opportunity-package.entity";
import { OpportunityServices } from "@modules/crm/opportunity/entities/opportunity-service.entity";
import { OpportunityServiceJobs } from "@modules/crm/opportunity/entities/opportunity-service-job.entity";
import { OpportunityRejections } from "@modules/crm/opportunity/entities/opportunity-rejection.entity";
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
} from "@modules/crm/opportunity/dto/opportunity.dto";
import { OpportunityStatus } from "@modules/crm/opportunity/enums/opportunity-status.enum";
import { TaxVerificationService } from "@modules/crm/customer/services/tax-verification.service";
import { OpportunityQueryService } from "./opportunity-query.service";
import { OpportunitySyncHelper } from "@modules/crm/opportunity/helpers/opportunity-sync.helper";

@Injectable()
export class OpportunityLifecycleService {
  constructor(
    @InjectRepository(Opportunities)
    private readonly oppRepo: Repository<Opportunities>,
    @InjectRepository(OpportunityPackages)
    private readonly pkgRepo: Repository<OpportunityPackages>,
    @InjectRepository(OpportunityServices)
    private readonly svcRepo: Repository<OpportunityServices>,
    @InjectRepository(OpportunityServiceJobs)
    private readonly jobRepo: Repository<OpportunityServiceJobs>,
    @InjectRepository(OpportunityRejections)
    private readonly rejRepo: Repository<OpportunityRejections>,
    private readonly taxService: TaxVerificationService,
    private readonly queryService: OpportunityQueryService,
    private readonly syncHelper: OpportunitySyncHelper,
  ) {}

  private async generateCode(): Promise<string> {
      const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `CH-${year}-${month}`;

        const count = await this.oppRepo.count({
            where: {
                opportunityCode: Like(`${prefix}%`)
            }
        });

        const sequence = (count + 1).toString().padStart(3, '0');
        return `${prefix}-${sequence}`;
  }

  async create(dto: CreateOpportunityDto, user?: any): Promise<Opportunities> {
    const { packages, services, ...opportunityData } = dto;

    if (opportunityData.leadTaxId) {
      await this.taxService.checkOpportunityTaxId(opportunityData.leadTaxId);
    }

    const code = await this.generateCode();
    const opp = this.oppRepo.create({
      ...opportunityData,
      opportunityCode: code,
      status: OpportunityStatus.PENDING_OPP_APPROVAL,
      createdById: user?.userId || user?.id,
    });

    const saved = await this.oppRepo.save(opp);
    await this.syncHelper.sync(saved, services, packages);

    return await this.queryService.getOne(saved.id, user);
  }

  async update(
    id: string,
    dto: UpdateOpportunityDto,
    user?: any,
  ): Promise<Opportunities> {
    const opp = await this.queryService.getOne(id, user);

    if (dto.leadTaxId && dto.leadTaxId !== opp.leadTaxId) {
      await this.taxService.checkOpportunityTaxId(dto.leadTaxId, id);
    }

    const { packages, services, ...rest } = dto;
    Object.assign(opp, rest);
    await this.oppRepo.save(opp);

    if (packages || services) {
      const svcs = await this.svcRepo.find({ where: { opportunityId: id } });
      const svcIds = svcs.map((s) => s.id);
      if (svcIds.length > 0) {
        await this.jobRepo
          .createQueryBuilder()
          .delete()
          .where('"opportunityServiceId" IN (:...svcIds)', { svcIds })
          .execute();
      }
      await this.svcRepo.delete({ opportunityId: id });
      await this.pkgRepo.delete({ opportunityId: id });
      await this.syncHelper.sync(opp, services, packages);
    }

    return await this.queryService.getOne(id, user);
  }

  async saveDraft(
    id: string,
    dto: UpdateOpportunityDto,
    user?: any,
  ): Promise<Opportunities> {
    return await this.update(id, dto, user);
  }

  async resubmit(id: string, user?: any): Promise<Opportunities> {
    const opp = await this.queryService.getOne(id, user);
    if (opp.status !== OpportunityStatus.OPP_REJECTED) {
      throw new BadRequestException("Chỉ cơ hội bị từ chối mới có thể gửi lại");
    }

    opp.status = OpportunityStatus.PENDING_OPP_APPROVAL;
    opp.rejectionReason = "";
    await this.oppRepo.save(opp);

    const latestRejection = await this.rejRepo.findOne({
      where: { opportunityId: id },
      order: { rejectedAt: "DESC" },
    });
    if (latestRejection) {
      latestRejection.resubmittedAt = new Date();
      await this.rejRepo.save(latestRejection);
    }

    return await this.queryService.getOne(id, user);
  }

  async addCustomer(
    id: string,
    customerId: string,
    user?: any,
  ): Promise<Opportunities> {
    const opp = await this.queryService.getOne(id, user);
    opp.customerId = customerId;
    await this.oppRepo.save(opp);
    return await this.queryService.getOne(id, user);
  }

  async approve(id: string): Promise<Opportunities> {
    const opp = await this.queryService.getOne(id);
    opp.status = OpportunityStatus.OPP_APPROVED;
    await this.oppRepo.save(opp);
    return await this.queryService.getOne(id);
  }

  async reject(id: string, reason: string, user?: any): Promise<Opportunities> {
    const opp = await this.queryService.getOne(id);
    opp.status = OpportunityStatus.OPP_REJECTED;
    opp.rejectionReason = reason;
    await this.oppRepo.save(opp);

    const rej = this.rejRepo.create({
      opportunityId: id,
      reason,
      rejectedById: user?.userId || user?.id,
      rejectedAt: new Date(),
    });
    await this.rejRepo.save(rej);

    return await this.queryService.getOne(id);
  }

  async delete(id: string): Promise<{ message: string }> {
    const opp = await this.queryService.getOne(id);
    const svcs = await this.svcRepo.find({ where: { opportunityId: id } });
    const svcIds = svcs.map((s) => s.id);
    if (svcIds.length > 0) {
      await this.jobRepo
        .createQueryBuilder()
        .delete()
        .where('"opportunityServiceId" IN (:...svcIds)', { svcIds })
        .execute();
    }
    await this.svcRepo.delete({ opportunityId: id });
    await this.pkgRepo.delete({ opportunityId: id });
    await this.oppRepo.remove(opp);
    return { message: "Xóa cơ hội thành công" };
  }
}
