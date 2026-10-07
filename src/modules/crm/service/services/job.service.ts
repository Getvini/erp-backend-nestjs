import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Jobs } from "@modules/crm/service/entities/job.entity";
import { CreateJobDto, UpdateJobDto } from "@modules/crm/service/dto/job.dto";

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Jobs)
    private readonly jobRepository: Repository<Jobs>,
  ) {}

  async getAll(
    query: { name?: string; category?: string } = {},
  ): Promise<Jobs[]> {
    const qb = this.jobRepository
      .createQueryBuilder("job")
      .leftJoinAndSelect("job.serviceJobs", "serviceJobs")
      .leftJoinAndSelect("serviceJobs.service", "service")
      .leftJoinAndSelect("job.vendorJobs", "vendorJobs")
      .leftJoinAndSelect("vendorJobs.vendor", "vendor")
      .orderBy("job.createdAt", "DESC");

    if (query.name && query.name.trim()) {
      const name = `%${query.name.trim()}%`;
      qb.andWhere("(job.name ILIKE :name OR job.code ILIKE :name)", { name });
    }

    if (query.category) {
      qb.andWhere(":category = ANY(job.categories)", {
        category: query.category,
      });
    }

    const items = await qb.getMany();
    for (const j of items) {
      (j as any).criteria = (j as any).criteria || [];
    }
    return items;
  }

  async getOne(id: string): Promise<Jobs> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: [
        "serviceJobs",
        "serviceJobs.service",
        "vendorJobs",
        "vendorJobs.vendor",
      ],
    });
    if (!job) throw new NotFoundException("Không tìm thấy công việc");
    (job as any).criteria = (job as any).criteria || [];
    return job;
  }

  async create(dto: CreateJobDto): Promise<Jobs> {
    const job = this.jobRepository.create(dto);
    return await this.jobRepository.save(job);
  }

  async update(id: string, dto: UpdateJobDto): Promise<Jobs> {
    const job = await this.getOne(id);
    Object.assign(job, dto);
    return await this.jobRepository.save(job);
  }

  async delete(id: string): Promise<{ message: string }> {
    const job = await this.getOne(id);
    await this.jobRepository.softRemove(job);
    return { message: "Xóa công việc thành công" };
  }
}
