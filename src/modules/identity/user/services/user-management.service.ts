import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { CreateUserDto, UpdateUserDto } from "@modules/identity/user/dto/user.dto";

@Injectable()
export class UserManagementService {
  constructor(private readonly dataSource: DataSource) {}

  async createUser(dto: CreateUserDto) {
    const existingAccount = await this.dataSource
      .getRepository(Accounts)
      .findOne({
        where: { username: dto.username },
      });

    if (existingAccount) {
      throw new ConflictException(`Tên đăng nhập '${dto.username}' đã tồn tại`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return await this.dataSource.transaction(async (manager) => {
      const user = manager.create(Users, {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        isLocked: false,
      });
      const savedUser = await manager.save(user);

      const account = manager.create(Accounts, {
        username: dto.username,
        password: hashedPassword,
        role: dto.role,
        isActive: true,
        userId: savedUser.id,
      });
      const savedAccount = await manager.save(account);

      return {
        id: savedUser.id,
        fullName: savedUser.fullName,
        phoneNumber: savedUser.phoneNumber,
        account: {
          id: savedAccount.id,
          username: savedAccount.username,
          role: savedAccount.role,
        },
      };
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(Users, {
        where: { id },
        relations: ["accounts"],
      });

      if (!user) {
        throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
      }

      if (dto.fullName !== undefined) user.fullName = dto.fullName;
      if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
      if (dto.isLocked !== undefined) user.isLocked = dto.isLocked;

      await manager.save(user);

      if (dto.role && user.accounts && user.accounts.length > 0) {
        for (const acc of user.accounts) {
          acc.role = dto.role;
          await manager.save(acc);
        }
      }

      return user;
    });
  }

  async deleteUser(id: string) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(Users, {
        where: { id },
        relations: ["accounts"],
      });

      if (!user) {
        throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
      }

      if (user.accounts && user.accounts.length > 0) {
        await manager.remove(user.accounts);
      }
      await manager.remove(user);

      return { message: "Xóa người dùng thành công" };
    });
  }

  async updateRole(id: string, role: any) {
    return this.updateUser(id, { role });
  }

  async updateLaborContracts(id: string, laborContract: any[]) {
    const userRepo = this.dataSource.getRepository(Users);
    const user = await userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
    }
    user.laborContract = laborContract;
    return await userRepo.save(user);
  }
}
