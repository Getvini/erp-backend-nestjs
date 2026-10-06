import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OpportunityServices } from "../entities/opportunity-service.entity";
import { OpportunityServiceJobs } from "../entities/opportunity-service-job.entity";
import {
  CreateOppServiceDto,
  UpdateOppServiceDto,
} from "../dto/opportunity-service.dto";

function calculateRecommendedSellingPrice(costAtSale: number): number {
  const cost = Number(costAtSale || 0);
  if (cost <= 0) return 0;
  return Math.ceil(cost / 0.6 / 10000) * 10000;
}

@Injectable()
export class OpportunityServiceService {
  constructor(
    @InjectRepository(OpportunityServices)
    private readonly oppSvcRepo: Repository<OpportunityServices>,
    @InjectRepository(OpportunityServiceJobs)
    private readonly jobRepo: Repository<OpportunityServiceJobs>,
  ) {}

  async getAllByOpportunity(
    opportunityId: string,
  ): Promise<OpportunityServices[]> {
    return await this.oppSvcRepo.find({
      where: { opportunityId },
      relations: ["service", "jobs", "jobs.job"],
    });
  }

  async getOne(id: string): Promise<OpportunityServices> {
    const item = await this.oppSvcRepo.findOne({
      where: { id },
      relations: [
        "opportunity",
        "opportunity.customer",
        "service",
        "jobs",
        "jobs.job",
      ],
    });
    if (!item) throw new NotFoundException("Không tìm thấy hạng mục dịch vụ");
    return item;
  }

  async create(dto: CreateOppServiceDto): Promise<OpportunityServices> {
    const svc = this.oppSvcRepo.create({
      opportunityId: dto.opportunityId,
      serviceId: dto.serviceId,
      quantity: dto.quantity || 1,
      costAtSale: dto.costAtSale || 0,
      sellingPrice: calculateRecommendedSellingPrice(dto.costAtSale || 0),
    });
    const saved = await this.oppSvcRepo.save(svc);
    return await this.getOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateOppServiceDto,
  ): Promise<OpportunityServices> {
    const item = await this.getOne(id);

    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.costAtSale !== undefined) item.costAtSale = dto.costAtSale;

    if (dto.jobs && Array.isArray(dto.jobs)) {
      for (const input of dto.jobs) {
        const job = item.jobs?.find((j) => j.id === input.id);
        if (!job) {
          throw new BadRequestException("Không tìm thấy hạng mục công việc");
        }

        if (input.briefVideo !== undefined) {
          job.briefVideo = input.briefVideo.trim() || null;
        }

        if (input.costAtSale !== undefined) {
          job.costAtSale = Number(input.costAtSale);
        }

        await this.jobRepo.save(job);
      }

      const allJobs = await this.jobRepo.find({
        where: { opportunityServiceId: id },
      });
      const quotationJobs = allJobs.filter(
        (j) => j.isQuotationItem && !j.isBriefVideo,
      );

      item.costAtSale = quotationJobs.reduce(
        (sum, j) => sum + Number(j.costAtSale || 0) * Number(j.quantity || 1),
        0,
      );
      item.sellingPrice = calculateRecommendedSellingPrice(item.costAtSale);
    }

    await this.oppSvcRepo.save(item);
    return await this.getOne(id);
  }

  async delete(id: string): Promise<{ message: string }> {
    const item = await this.getOne(id);
    await this.jobRepo.delete({ opportunityServiceId: id });
    await this.oppSvcRepo.remove(item);
    return { message: "Xóa hạng mục dịch vụ thành công" };
  }
}
