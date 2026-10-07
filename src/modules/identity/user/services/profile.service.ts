import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { RefreshSessions } from "@modules/identity/auth/entities/refresh-session.entity";
import {
  UpdateProfileDto,
  ChangePasswordDto,
} from "@modules/identity/user/dto/profile.dto";

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @InjectRepository(Accounts)
    private readonly accountRepo: Repository<Accounts>,
  ) {}

  async getMyProfile(currentUser: any) {
    const account = await this.accountRepo.findOne({
      where: { id: currentUser.id },
      relations: ["user"],
    });

    if (!account) {
      throw new NotFoundException("Không tìm thấy tài khoản người dùng");
    }

    return {
      id: account.user?.id || account.id,
      accountId: account.id,
      userId: account.user?.id,
      fullName: account.user?.fullName,
      phoneNumber: account.user?.phoneNumber,
      birthday: account.user?.birthday,
      username: account.username,
      email: account.email,
      role: account.role,
      vinicoin: account.vinicoin,
      vinicoinTotal: account.vinicoinTotal,
      vinicoinWithdrawn: account.vinicoinWithdrawn,
      user: account.user,
    };
  }

  async updateProfile(currentUser: any, dto: UpdateProfileDto) {
    const userId = currentUser.userId;
    if (!userId) {
      throw new NotFoundException(
        "Tài khoản chưa được liên kết với hồ sơ nhân sự",
      );
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Không tìm thấy hồ sơ người dùng");
    }

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.phoneNumber) user.phoneNumber = dto.phoneNumber;
    if (dto.birthday) user.birthday = dto.birthday;

    return await this.userRepo.save(user);
  }

  async changePassword(currentUser: any, dto: ChangePasswordDto) {
    const account = await this.accountRepo
      .createQueryBuilder("account")
      .addSelect("account.password")
      .where("account.id = :id", { id: currentUser.id })
      .getOne();

    if (!account) {
      throw new NotFoundException("Tài khoản không tồn tại");
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, account.password);
    if (!isMatch) {
      throw new UnauthorizedException("Mật khẩu hiện tại không chính xác");
    }

    account.password = await bcrypt.hash(dto.newPassword, 10);
    await this.accountRepo.save(account);

    // Thu hồi toàn bộ refresh sessions đang hoạt động để buộc đăng nhập lại
    await this.accountRepo.manager.update(
      RefreshSessions,
      { accountId: account.id },
      { revokedAt: new Date() },
    );

    return { message: "Đổi mật khẩu thành công" };
  }
}
