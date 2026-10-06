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
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.accounts", "account")
      .orderBy("user.createdAt", "DESC")
      .skip(skip)
      .take(limit);

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

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ["accounts"],
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
    }

    return user;
  }
}
