import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customers } from "@modules/crm/customer/entities/customer.entity";
import { CustomerQueryDto } from "@modules/crm/customer/dto/customer.dto";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@Injectable()
export class CustomerQueryService {
  constructor(
    @InjectRepository(Customers)
    private readonly customerRepository: Repository<Customers>,
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
      "Bạn không có quyền truy cập danh sách khách hàng",
    );
  }

  async getAll(query: CustomerQueryDto, user?: any): Promise<Customers[]> {
    const { isRestrictedToCreator } = this.validateRbac(user);

    const qb = this.customerRepository
      .createQueryBuilder("customer")
      .leftJoinAndSelect("customer.referralPartner", "referralPartner")
      .leftJoinAndSelect("customer.createdBy", "createdBy")
      .orderBy("customer.createdAt", "DESC");

    if (isRestrictedToCreator) {
      const actorUserId = user.userId || user.id;
      qb.andWhere(
        "(customer.createdBy.id = :actorUserId OR createdBy.id = :actorUserId)",
        { actorUserId },
      );
    }

    if (query.source && query.source !== "ALL") {
      const sources = Array.isArray(query.source)
        ? query.source
        : query.source.includes(",")
          ? query.source.split(",").map((s) => s.trim())
          : [query.source];
      qb.andWhere("customer.source IN (:...sources)", { sources });
    }

    if (query.search && query.search.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        `(customer.name ILIKE :search OR customer.phone ILIKE :search OR customer.email ILIKE :search OR customer.taxId ILIKE :search OR customer.address ILIKE :search OR referralPartner.name ILIKE :search)`,
        { search },
      );
    }

    return await qb.getMany();
  }

  async getOne(id: string, user?: any): Promise<Customers> {
    const { isRestrictedToCreator } = this.validateRbac(user);

    const qb = this.customerRepository
      .createQueryBuilder("customer")
      .leftJoinAndSelect("customer.referralPartner", "referralPartner")
      .leftJoinAndSelect("customer.createdBy", "createdBy")
      .leftJoinAndSelect("createdBy.accounts", "accounts")
      .leftJoinAndSelect("customer.opportunities", "opportunities")
      .where("customer.id = :id", { id });

    if (isRestrictedToCreator) {
      const actorUserId = user.userId || user.id;
      qb.andWhere("customer.createdBy.id = :actorUserId", { actorUserId });
    }

    const customer = await qb.getOne();
    if (!customer) {
      throw new NotFoundException(
        "Không tìm thấy khách hàng hoặc bạn không có quyền xem",
      );
    }
    (customer as any).contracts = (customer as any).contracts || [];
    return customer;
  }
}
