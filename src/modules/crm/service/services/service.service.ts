import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Services } from "@modules/crm/service/entities/service.entity";
import { ServiceJob } from "@modules/crm/service/entities/service-job.entity";
import {
  CreateServiceDto,
  UpdateServiceDto,
  BulkDeleteServicesDto,
} from "@modules/crm/service/dto/service.dto";

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(Services)
    private readonly serviceRepository: Repository<Services>,
    @InjectRepository(ServiceJob)
    private readonly serviceJobRepository: Repository<ServiceJob>,
  ) {}

  async getAll(query: any = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 1000);

    const qb = this.serviceRepository
      .createQueryBuilder("service")
      .leftJoinAndSelect("service.serviceJobs", "serviceJob")
      .leftJoinAndSelect("serviceJob.job", "job")
      .orderBy("service.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search && query.search.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        "(service.name ILIKE :search OR service.code ILIKE :search OR service.description ILIKE :search)",
        { search },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: string): Promise<Services> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ["serviceJobs", "serviceJobs.job"],
    });
    if (!service) throw new NotFoundException("Không tìm thấy dịch vụ");
    return service;
  }

  async create(dto: CreateServiceDto): Promise<Services> {
    const service = this.serviceRepository.create({
      name: dto.name,
      code: dto.code,
      description: dto.description,
      unit: dto.unit,
      costPrice: dto.costPrice || 0,
      overheadCost: dto.overheadCost || 0,
      isAI: dto.isAI || false,
    });

    const saved = await this.serviceRepository.save(service);

    if (dto.jobs && Array.isArray(dto.jobs)) {
      for (const item of dto.jobs) {
        const sj = this.serviceJobRepository.create({
          serviceId: saved.id,
          jobId: item.jobId,
          quantity: item.quantity || 1,
          isOutput: item.isOutput || false,
        });
        await this.serviceJobRepository.save(sj);
      }
    }

    return await this.getOne(saved.id);
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Services> {
    const service = await this.getOne(id);
    Object.assign(service, {
      name: dto.name ?? service.name,
      code: dto.code ?? service.code,
      description: dto.description ?? service.description,
      unit: dto.unit ?? service.unit,
      costPrice: dto.costPrice ?? service.costPrice,
      overheadCost: dto.overheadCost ?? service.overheadCost,
      isAI: dto.isAI ?? service.isAI,
    });
    await this.serviceRepository.save(service);

    if (dto.jobs && Array.isArray(dto.jobs)) {
      await this.serviceJobRepository.delete({ serviceId: id });
      for (const item of dto.jobs) {
        const sj = this.serviceJobRepository.create({
          serviceId: id,
          jobId: item.jobId,
          quantity: item.quantity || 1,
          isOutput: item.isOutput || false,
        });
        await this.serviceJobRepository.save(sj);
      }
    }

    return await this.getOne(id);
  }

  async delete(id: string): Promise<{ message: string }> {
    const service = await this.getOne(id);
    await this.serviceRepository.softRemove(service);
    return { message: "Xóa dịch vụ thành công" };
  }

  async bulkDelete(dto: BulkDeleteServicesDto): Promise<{ message: string }> {
    if (dto.ids && dto.ids.length > 0) {
      await this.serviceRepository.softDelete({ id: In(dto.ids) });
    }
    return { message: "Xóa các dịch vụ thành công" };
  }

  async addJob(serviceId: string, jobId: string): Promise<ServiceJob> {
    const existing = await this.serviceJobRepository.findOne({
      where: { serviceId, jobId },
    });
    if (existing) return existing;

    const sj = this.serviceJobRepository.create({
      serviceId,
      jobId,
      quantity: 1,
      isOutput: false,
    });
    return await this.serviceJobRepository.save(sj);
  }

  async removeJob(
    serviceId: string,
    jobId: string,
  ): Promise<{ message: string }> {
    await this.serviceJobRepository.delete({ serviceId, jobId });
    return { message: "Xóa job khỏi dịch vụ thành công" };
  }
}
