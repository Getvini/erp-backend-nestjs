import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { OpportunityPackages } from "@modules/crm/opportunity/entities/opportunity-package.entity";
import { OpportunityServices } from "@modules/crm/opportunity/entities/opportunity-service.entity";
import { OpportunityServiceJobs } from "@modules/crm/opportunity/entities/opportunity-service-job.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { calculateRecommendedSellingPrice } from "./pricing.helper";

@Injectable()
export class OpportunitySyncHelper {
  constructor(
    @InjectRepository(OpportunityPackages)
    private readonly pkgRepo: Repository<OpportunityPackages>,
    @InjectRepository(OpportunityServices)
    private readonly svcRepo: Repository<OpportunityServices>,
    @InjectRepository(OpportunityServiceJobs)
    private readonly jobRepo: Repository<OpportunityServiceJobs>,
    @InjectRepository(Services)
    private readonly serviceRepo: Repository<Services>,
  ) {}

  async sync(opp: Opportunities, services?: any[], packages?: any[]) {
    if (packages && Array.isArray(packages)) {
      for (const p of packages) {
        const pkg = await this.pkgRepo.save(
          this.pkgRepo.create({
            opportunityId: opp.id,
            name: p.name,
            description: p.description,
            quantity: p.quantity || 1,
            servicePackageId: p.servicePackageId,
          }),
        );

        for (const s of p.services || []) {
          await this.saveServiceItem(opp.id, s, pkg);
        }
      }
    }

    if (services && Array.isArray(services)) {
      for (const s of services) {
        await this.saveServiceItem(opp.id, s);
      }
    }
  }

  private async saveServiceItem(
    oppId: string,
    s: any,
    pkg?: OpportunityPackages,
  ) {
    const serviceId = s.serviceId || s.id;
    const orig = serviceId
      ? await this.serviceRepo.findOne({
          where: { id: serviceId },
          relations: ["serviceJobs", "serviceJobs.job"],
        })
      : null;

    const svc = await this.svcRepo.save(
      this.svcRepo.create({
        opportunityId: oppId,
        opportunityPackageId: pkg?.id || null,
        serviceId: serviceId || null,
        name: s.name || orig?.name || "Dịch vụ",
        quantity: (s.quantity || 1) * (pkg?.quantity || 1),
        sellingPrice: s.sellingPrice || orig?.costPrice || 0,
        costAtSale: s.costAtSale || orig?.costPrice || 0,
        packageName: pkg?.name || null,
        isPackageService: Boolean(pkg),
      }),
    );

    await this.createServiceJobs(svc, s.jobs, orig);
    await this.recalculateServicePrices(svc.id, s.sellingPrice);
  }

  private async recalculateServicePrices(
    svcId: string,
    fallbackPrice?: number,
  ) {
    const jobs = await this.jobRepo.find({
      where: { opportunityServiceId: svcId },
    });
    const quotationJobs = jobs.filter(
      (job) => job.isQuotationItem && !job.isBriefVideo,
    );
    const costAtSale = quotationJobs.reduce(
      (sum, job) =>
        sum + Number(job.costAtSale || 0) * Number(job.quantity || 1),
      0,
    );
    const sellingPrice =
      fallbackPrice && Number(fallbackPrice) > 0
        ? Number(fallbackPrice)
        : calculateRecommendedSellingPrice(costAtSale);

    await this.svcRepo.update(svcId, { costAtSale, sellingPrice });
  }

  private async createServiceJobs(
    svc: OpportunityServices,
    inputJobs?: any[],
    origService?: Services | null,
  ) {
    const origJobs = origService?.serviceJobs || [];
    const jobMap = new Map(origJobs.map((sj) => [sj.job?.id || sj.jobId, sj]));

    if (inputJobs && Array.isArray(inputJobs) && inputJobs.length > 0) {
      for (const j of inputJobs) {
        const jobId = j.jobId || j.id;
        if (!jobId) continue;
        const sj = jobMap.get(jobId);
        const costAtSale =
          Number(j.costAtSale || 0) > 0
            ? Number(j.costAtSale)
            : Number(sj?.job?.costPrice || 0);

        await this.jobRepo.save(
          this.jobRepo.create({
            opportunityServiceId: svc.id,
            jobId,
            serviceJobId: j.serviceJobId || sj?.id || null,
            name: j.name || sj?.job?.name || "Hạng mục",
            quantity: Number(j.quantity || 1),
            costAtSale,
            briefVideo: j.briefVideo?.trim() || null,
            isBriefVideo: Boolean(j.isBriefVideo ?? sj?.job?.isBriefVideo),
            isQuotationItem:
              j.isQuotationItem !== false &&
              sj?.job?.isQuotationItem !== false &&
              !j.isBriefVideo &&
              !sj?.job?.isBriefVideo,
          }),
        );
      }
      return;
    }

    for (const sj of origJobs) {
      if (!sj.job) continue;
      await this.jobRepo.save(
        this.jobRepo.create({
          opportunityServiceId: svc.id,
          jobId: sj.job.id,
          serviceJobId: sj.id,
          name: sj.job.name,
          quantity: Number(sj.quantity || 1),
          costAtSale: Number(sj.job.costPrice || 0),
          isBriefVideo: Boolean(sj.job.isBriefVideo),
          isQuotationItem:
            !sj.job.isBriefVideo && sj.job.isQuotationItem !== false,
        }),
      );
    }
  }
}
