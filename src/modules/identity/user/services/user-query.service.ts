import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Users } from "../entities/user.entity";
import { Accounts } from "../../auth/entities/account.entity";
import { QueryUserDto } from "../dto/user.dto";

@Injectable()
export class UserQueryService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @InjectRepository(Accounts)
    private readonly accountRepo: Repository<Accounts>,
  ) {}

  async getAllUsers(query: QueryUserDto) {
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
    return items.map((u) => ({
      ...u,
      account: u.accounts?.[0] || null,
      tasks: (u as any).tasks || [],
      workload: null,
    }));
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id, isLocked: false },
      relations: ["accounts"],
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
    }

    return {
      ...user,
      account: user.accounts?.[0] || null,
      tasks: (user as any).tasks || [],
      workload: null,
    };
  }
}
