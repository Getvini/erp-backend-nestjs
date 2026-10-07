import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { Accounts } from "../entities/account.entity";
import { Users } from "../../user/entities/user.entity";

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Accounts)
    private readonly accountRepo: Repository<Accounts>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
  ) {}

  async getAllAccounts() {
    return this.accountRepo
      .createQueryBuilder("account")
      .addSelect("account.password")
      .leftJoinAndSelect("account.user", "user")
      .where("account.isActive = :isActive", { isActive: true })
      .orderBy("account.createdAt", "DESC")
      .getMany();
  }

  async getAccountById(id: string) {
    const account = await this.accountRepo
      .createQueryBuilder("account")
      .addSelect("account.password")
      .leftJoinAndSelect("account.user", "user")
      .where("account.id = :id", { id })
      .getOne();
    if (!account) throw new NotFoundException("Không tìm thấy tài khoản");
    return account;
  }

  async updateAccount(id: string, data: any) {
    const account = await this.getAccountById(id);
    const { username, email, role, fullName, phoneNumber, birthday, isActive } =
      data;

    if (username !== undefined) account.username = username;
    if (email !== undefined) account.email = email;
    if (role !== undefined) account.role = role;
    if (isActive !== undefined) account.isActive = isActive;

    await this.accountRepo.manager.transaction(async (txManager) => {
      if (account.user) {
        if (fullName !== undefined) account.user.fullName = fullName;
        if (phoneNumber !== undefined) account.user.phoneNumber = phoneNumber;
        if (birthday !== undefined) account.user.birthday = birthday || null;
        await txManager.save(account.user);
      }
      await txManager.save(account);
    });

    return "Cập nhật tài khoản thành công";
  }

  async softDeleteAccount(id: string) {
    const account = await this.getAccountById(id);
    account.isActive = false;
    await this.accountRepo.save(account);
  }

  async resetPassword(id: string, newPass: string) {
    const account = await this.getAccountById(id);
    account.password = await bcrypt.hash(newPass, 10);
    await this.accountRepo.save(account);
  }
}
