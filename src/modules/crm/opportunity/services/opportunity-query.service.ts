import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Opportunities } from "../entities/opportunity.entity";
import { OpportunityQueryDto } from "../dto/opportunity.dto";
import { UserRole } from "../../../identity/user/enums/user-role.enum";

@Injectable()
export class OpportunityQueryService {
  constructor(
    @InjectRepository(Opportunities)
    private readonly opportunityRepository: Repository<Opportunities>,
  ) {}

  private validateRbac(user?: any): { isRestrictedToCreator: boolean } {
    if (!user) return { isRestrictedToCreator: false };

    const role = user.role as UserRole;
    if ([UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE].includes(role)) {
      return { isRestrictedToCreator: false };
    }

    if (role === UserRole.BD) {
      return { isRestrictedToCreator: true };
    }

    throw new ForbiddenException(
      "Bạn không có quyền truy cập danh sách cơ hội bán hàng",
    );
  }

  async getAll(query: OpportunityQueryDto, user?: any) {
    const { isRestrictedToCreator } = this.validateRbac(user);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const sortBy = query.sortBy || "createdAt";
    const sortDir = (query.sortDir || "DESC").toUpperCase() as "ASC" | "DESC";

    const qb = this.opportunityRepository
      .createQueryBuilder("opp")
      .leftJoinAndSelect("opp.customer", "customer")
      .leftJoinAndSelect("opp.referralPartner", "referralPartner")
      .leftJoinAndSelect("opp.createdBy", "createdBy")
      .skip((page - 1) * limit)
      .take(limit);

    if (sortBy.includes(".")) {
      qb.orderBy(sortBy, sortDir);
    } else {
      qb.orderBy(`opp.${sortBy}`, sortDir);
    }

    if (isRestrictedToCreator) {
      const actorUserId = user.userId || user.id;
      qb.andWhere(
        "(opp.createdById = :actorUserId OR createdBy.id = :actorUserId OR customer.createdBy.id = :actorUserId)",
        { actorUserId },
      );
    }

    if (query.status && query.status !== "ALL") {
      qb.andWhere("opp.status = :status", { status: query.status });
    }

    if (query.customerId) {
      qb.andWhere("opp.customerId = :customerId", {
        customerId: query.customerId,
      });
    }

    if (query.search && query.search.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        "(opp.name ILIKE :search OR opp.opportunityCode ILIKE :search OR opp.leadName ILIKE :search OR opp.leadPhone ILIKE :search OR customer.name ILIKE :search)",
        { search },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getOne(id: string, user?: any): Promise<Opportunities> {
    const { isRestrictedToCreator } = this.validateRbac(user);

    const qb = this.opportunityRepository
      .createQueryBuilder("opp")
      .leftJoinAndSelect("opp.customer", "customer")
      .leftJoinAndSelect("opp.referralPartner", "referralPartner")
      .leftJoinAndSelect("opp.packages", "packages")
      .leftJoinAndSelect("packages.services", "pkgServices")
      .leftJoinAndSelect("pkgServices.service", "pkgSvc")
      .leftJoinAndSelect("pkgServices.jobs", "pkgJobs")
      .leftJoinAndSelect("pkgJobs.job", "pkgJob")
      .leftJoinAndSelect("opp.services", "services")
      .leftJoinAndSelect("services.service", "svc")
      .leftJoinAndSelect("services.jobs", "jobs")
      .leftJoinAndSelect("jobs.job", "job")
      .leftJoinAndSelect("opp.quotations", "quotations")
      .leftJoinAndSelect("opp.rejections", "rejections")
      .leftJoinAndSelect("rejections.rejectedBy", "rejectedBy")
      .leftJoinAndSelect("opp.createdBy", "createdBy")
      .where("opp.id = :id", { id });

    if (isRestrictedToCreator) {
      const actorUserId = user.userId || user.id;
      qb.andWhere(
        "(opp.createdById = :actorUserId OR customer.createdBy.id = :actorUserId)",
        { actorUserId },
      );
    }

    const opportunity = await qb.getOne();
    if (!opportunity) {
      throw new NotFoundException(
        "Không tìm thấy cơ hội hoặc bạn không có quyền xem",
      );
    }

    opportunity.quotations = opportunity.quotations || [];
    opportunity.packages = opportunity.packages || [];
    opportunity.services = opportunity.services || [];
    opportunity.rejections = opportunity.rejections || [];

    return opportunity;
  }
}
