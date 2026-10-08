import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, In } from "typeorm";
import { Contract } from "@modules/finance/entities/contract.entity";
import { ContractQueryDto } from "@modules/finance/contract/dto/contract.dto";

@Injectable()
export class ContractQueryService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
  ) {}

  private getRbacWhere(user: any): any {
    const { role, id: accountId, userId, companyId: _companyId } = user;
    const PM_ROLES = ["BOD", "ADMIN", "ACCOUNTANT", "SALE_MANAGER"];
    if (PM_ROLES.includes(role)) return {};

    if (["SALE", "BUSINESS_DEVELOPER", "SALE_LEADER"].includes(role)) {
      return [
        { createdById: userId || accountId },
        { opportunity: { createdBy: { id: userId || accountId } } },
      ];
    }
    if (
      [
        "PROJECT_MANAGER",
        "ACCOUNT",
        "QC",
        "STAFF",
        "EDITOR",
        "DESIGNER",
        "COPYWRITER",
        "CREATIVE_DIRECTOR",
        "OPERATION_MANAGER",
      ].includes(role)
    ) {
      return { project: { team: { members: { user: { id: userId } } } } };
    }
    throw new ForbiddenException("FORBIDDEN_ACCESS");
  }

  async getAll(query: ContractQueryDto, user: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const ALLOWED_SORT_MAP: Record<string, string> = {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      contractCode: "contractCode",
      name: "name",
      status: "status",
      sellingPrice: "sellingPrice",
      cost: "cost",
      signedAt: "signedAt",
      effectiveDate: "effectiveDate",
      expirationDate: "expirationDate",
      durationMonths: "durationMonths",
    };

    const rawSortBy = query.sortBy || "createdAt";
    const sortBy = ALLOWED_SORT_MAP[rawSortBy] || "createdAt";
    const sortDir =
      (query.sortDir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    let rbacWhere: any;
    try {
      rbacWhere = this.getRbacWhere(user);
    } catch {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const baseWhere: any = {};
    if (query.status && query.status !== "ALL") {
      const list =
        typeof query.status === "string" && query.status.includes(",")
          ? query.status
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null;
      baseWhere.status = list?.length ? In(list) : query.status;
    }
    if (query.customerId) baseWhere.customer = { id: query.customerId };

    const buildWhere = (rbac: any) => {
      if (!query.search?.trim()) return { ...baseWhere, ...rbac };
      const t = `%${query.search.trim()}%`;
      return [
        { ...baseWhere, ...rbac, contractCode: ILike(t) },
        { ...baseWhere, ...rbac, name: ILike(t) },
        {
          ...baseWhere,
          ...rbac,
          customer: { ...(rbac.customer || {}), name: ILike(t) },
        },
      ];
    };

    let where: any[] = [];
    const rbacs = Array.isArray(rbacWhere) ? rbacWhere : [rbacWhere];
    for (const r of rbacs) {
      const w = buildWhere(r);
      where = where.concat(Array.isArray(w) ? w : [w]);
    }

    const [items, total] = await this.contractRepo.findAndCount({
      where: where.length === 1 ? where[0] : where,
      relations: [
        "customer",
        "opportunity",
        "opportunity.referralPartner",
        "debts",
        "addendums",
      ],
      order: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: string, user?: any) {
    let where: any = { id };
    if (user) {
      try {
        const rbac = this.getRbacWhere(user);
        if (Array.isArray(rbac)) {
          where = rbac.map((r) => ({ id, ...r }));
        } else {
          where = { id, ...rbac };
        }
      } catch {
        throw new ForbiddenException("Bạn không có quyền xem hợp đồng này");
      }
    }

    const contract = await this.contractRepo.findOne({
      where,
      relations: [
        "customer",
        "opportunity",
        "milestones",
        "services",
        "services.service",
        "debts",
        "addendums",
        "project",
      ],
    });
    if (!contract) {
      throw new NotFoundException("Không tìm thấy hợp đồng");
    }
    return contract;
  }
}
