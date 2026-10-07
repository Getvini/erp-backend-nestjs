import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { AcceptanceRequests } from "../entities/acceptance-request.entity";
import { AcceptanceStatus } from "../enums/acceptance.enum";
import { AcceptanceQueryDto } from "../dto/acceptance.dto";

@Injectable()
export class AcceptanceQueryService {
  constructor(
    @InjectRepository(AcceptanceRequests)
    private readonly acceptanceRepo: Repository<AcceptanceRequests>,
  ) {}

  async getRequest(id: string) {
    const request = await this.acceptanceRepo.findOne({
      where: { id },
      order: { createdAt: "DESC" },
      relations: ["services", "requester", "approver", "project"],
    });

    if (request && request.services) {
      request.services = request.services.map((service: any) => {
        if (!service.results || service.results.length === 0) return service;

        const requestResults = service.results.filter(
          (r: any) => r.acceptanceRequestId === request.id,
        );

        if (requestResults.length > 0) {
          return { ...service, results: requestResults };
        }

        const statusMap: Record<string, string[]> = {
          [AcceptanceStatus.REJECTED]: ["REJECTED"],
          [AcceptanceStatus.APPROVED]: ["APPROVED"],
          [AcceptanceStatus.PENDING]: ["PENDING"],
          [AcceptanceStatus.PROCESSED]: ["APPROVED", "REJECTED"],
        };
        const matchingStatuses = statusMap[request.status] || [];
        const untaggedResults = service.results.filter(
          (r: any) =>
            !r.acceptanceRequestId && matchingStatuses.includes(r.status),
        );

        if (untaggedResults.length > 0) {
          return { ...service, results: untaggedResults };
        }

        return { ...service, results: [] };
      });
    }

    return request;
  }

  async getAllRequests(filters: AcceptanceQueryDto = {}) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    const findOptions: any = {
      where,
      order: { createdAt: "DESC" },
      relations: ["requester", "approver", "project", "services"],
      take: limit,
      skip,
    };

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      findOptions.where = [
        { ...where, name: ILike(searchTerm) },
        { ...where, project: { name: ILike(searchTerm) } },
      ];
    }

    const [items, total] = await this.acceptanceRepo.findAndCount(findOptions);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
