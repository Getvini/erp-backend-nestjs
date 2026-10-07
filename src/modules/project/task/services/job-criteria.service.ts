import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCriterias } from "../entities/job-criteria.entity";
import { Jobs } from "../../../crm/service/entities/job.entity";
import {
  CreateJobCriteriaDto,
  SyncJobCriteriaItemDto,
} from "../dto/job-criteria.dto";

@Injectable()
export class JobCriteriaService {
  constructor(
    @InjectRepository(JobCriterias)
    private readonly criteriaRepository: Repository<JobCriterias>,
    @InjectRepository(Jobs)
    private readonly jobRepository: Repository<Jobs>,
  ) {}

  async getByJob(jobId: string) {
    return this.criteriaRepository.find({
      where: { jobId },
    });
  }

  async create(data: CreateJobCriteriaDto) {
    const job = await this.jobRepository.findOne({ where: { id: data.jobId } });
    if (!job) throw new NotFoundException("Không tìm thấy công việc (Job)");

    const criteria = this.criteriaRepository.create({
      jobId: data.jobId,
      name: data.name,
      description: data.description,
    });

    return this.criteriaRepository.save(criteria);
  }

  async delete(id: string) {
    const criteria = await this.criteriaRepository.findOne({ where: { id } });
    if (!criteria) throw new NotFoundException("Không tìm thấy tiêu chí");
    return this.criteriaRepository.softRemove(criteria);
  }

  async syncCriteria(jobId: string, criteriaData: SyncJobCriteriaItemDto[]) {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException("Không tìm thấy công việc (Job)");

    const existingCriteria = await this.criteriaRepository.find({
      where: { jobId },
    });

    // 1. Identify criteria to soft-delete
    const incomingIds = criteriaData
      .map((c) => c.id)
      .filter((id): id is string => Boolean(id));
    const criteriaToDelete = existingCriteria.filter(
      (c) => !incomingIds.includes(c.id),
    );

    if (criteriaToDelete.length > 0) {
      await this.criteriaRepository.softRemove(criteriaToDelete);
    }

    // 2. Identify criteria to update or create
    const finalCriteria: JobCriterias[] = [];
    for (const data of criteriaData) {
      if (data.id) {
        const existing = existingCriteria.find((c) => c.id === data.id);
        if (existing) {
          existing.name = data.name;
          existing.description = data.description || existing.description;
          finalCriteria.push(existing);
        }
      } else {
        const nouveau = this.criteriaRepository.create({
          name: data.name,
          description: data.description,
          jobId: jobId,
        });
        finalCriteria.push(nouveau);
      }
    }

    return this.criteriaRepository.save(finalCriteria);
  }
}
