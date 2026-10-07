import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { QueryUserDto } from "@modules/identity/user/dto/user.dto";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@Injectable()
export class UserQueryService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @InjectRepository(Accounts)
    private readonly accountRepo: Repository<Accounts>,
  ) {}

  async getAllUsers(query: QueryUserDto, currentUser?: any) {
    const isManagement =
      currentUser?.role === UserRole.ADMIN ||
      currentUser?.role === UserRole.BOD;

    const qb = this.userRepo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.accounts", "account")
      .where("user.isLocked = :isLocked", { isLocked: false })
      .orderBy("user.createdAt", "DESC");

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        "(user.fullName ILIKE :term OR user.phoneNumber ILIKE :term OR account.username ILIKE :term)",
        { term },
      );
    }

    if (query.role) {
      qb.andWhere("account.role = :role", { role: query.role });
    }

    const items = await qb.getMany();
    return items.map((u) => {
      const { laborContract, ...rest } = u;
      return {
        ...rest,
        laborContract: isManagement ? laborContract : undefined,
        account: u.accounts?.[0] || null,
        tasks: (u as any).tasks || [],
        workload: null,
      };
    });
  }

  async getUserById(id: string, currentUser?: any) {
    const user = await this.userRepo.findOne({
      where: { id, isLocked: false },
      relations: ["accounts"],
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
    }

    const isManagement =
      currentUser?.role === UserRole.ADMIN ||
      currentUser?.role === UserRole.BOD;
    const isOwner =
      currentUser?.userId === user.id || currentUser?.id === user.id;
    const canViewContract = isManagement || isOwner;

    const { laborContract, ...rest } = user;
    return {
      ...rest,
      laborContract: canViewContract ? laborContract : undefined,
      account: user.accounts?.[0] || null,
      tasks: (user as any).tasks || [],
      workload: null,
    };
  }
}
