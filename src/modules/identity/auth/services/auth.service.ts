import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { ulid } from "ulid";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { RefreshSessions } from "@modules/identity/auth/entities/refresh-session.entity";
import { LoginDto } from "@modules/identity/auth/dto/auth.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Accounts)
    private readonly accountRepo: Repository<Accounts>,
    @InjectRepository(RefreshSessions)
    private readonly refreshSessionRepo: Repository<RefreshSessions>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const account = await this.accountRepo
      .createQueryBuilder("account")
      .addSelect("account.password")
      .leftJoinAndSelect("account.user", "user")
      .where("account.username = :username OR account.email = :username", {
        username,
      })
      .getOne();

    if (!account) {
      throw new UnauthorizedException(
        "Tài khoản hoặc mật khẩu không chính xác",
      );
    }

    if (!account.isActive || account.user?.isLocked) {
      throw new UnauthorizedException(
        "Tài khoản đã bị tạm khóa hoặc ngừng hoạt động",
      );
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw new UnauthorizedException(
        "Tài khoản hoặc mật khẩu không chính xác",
      );
    }

    const sessionId = ulid();
    const payload = {
      id: account.id,
      userId: account.userId || account.user?.id,
      username: account.username,
      role: account.role,
      email: account.email,
      type: "access",
    };

    const accessToken = this.jwtService.sign(payload);

    const rememberMe = Boolean(loginDto.rememberMe);
    const refreshDays = rememberMe ? 30 : 1;
    const accessMaxAge = 2 * 60 * 60 * 1000;
    const refreshMaxAge = refreshDays * 24 * 60 * 60 * 1000;

    const refreshSecret =
      this.configService.get<string>("app.jwt.refreshSecret") ||
      this.configService.get<string>("app.jwt.secret");

    const refreshToken = jwt.sign(
      { id: account.id, sessionId, type: "refresh" },
      refreshSecret,
      { expiresIn: `${refreshDays}d` },
    );

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + refreshMaxAge);

    await this.refreshSessionRepo.save({
      id: sessionId,
      accountId: account.id,
      tokenHash,
      expiresAt,
    });

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      accessMaxAge,
      refreshMaxAge,
      rememberMe,
      user: {
        id: account.user?.id || account.id,
        accountId: account.id,
        userId: account.userId || account.user?.id,
        username: account.username,
        role: account.role,
        fullName: account.user?.fullName,
      },
    };
  }

  async refreshToken(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException(
        "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
      );
    }

    const refreshSecret =
      this.configService.get<string>("app.jwt.refreshSecret") ||
      this.configService.get<string>("app.jwt.secret");

    if (!refreshSecret) {
      throw new UnauthorizedException(
        "Khóa bí mật xác thực chưa được cấu hình",
      );
    }

    let sessionId: string | null = null;
    try {
      const decoded = jwt.verify(rawRefreshToken, refreshSecret) as any;
      if (decoded && decoded.type === "refresh") {
        sessionId = decoded.sessionId;
      }
    } catch {
      // Fallback cho raw token hash nếu token không phải là JWT
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawRefreshToken)
      .digest("hex");

    const session = sessionId
      ? await this.refreshSessionRepo.findOne({
          where: { id: sessionId },
          relations: ["account", "account.user"],
        })
      : await this.refreshSessionRepo.findOne({
          where: { tokenHash },
          relations: ["account", "account.user"],
        });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException(
        "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
      );
    }

    const account = session.account;
    if (!account || !account.isActive || account.user?.isLocked) {
      throw new UnauthorizedException("Tài khoản không hợp lệ hoặc đã bị khóa");
    }

    const payload = {
      id: account.id,
      userId: account.userId || account.user?.id,
      username: account.username,
      role: account.role,
      email: account.email,
      type: "access",
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newSessionId = ulid();
    const newRefreshToken = jwt.sign(
      { id: account.id, sessionId: newSessionId, type: "refresh" },
      refreshSecret,
      { expiresIn: "7d" },
    );
    const newTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    session.tokenHash = newTokenHash;
    await this.refreshSessionRepo.save(session);

    return {
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessMaxAge: 2 * 60 * 60 * 1000,
      refreshMaxAge: session.expiresAt.getTime() - Date.now(),
      user: {
        id: account.user?.id || account.id,
        accountId: account.id,
        userId: account.userId || account.user?.id,
        username: account.username,
        role: account.role,
        fullName: account.user?.fullName,
      },
    };
  }

  async logout(userId?: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawRefreshToken)
        .digest("hex");
      await this.refreshSessionRepo.update(
        { tokenHash },
        { revokedAt: new Date() },
      );
    }
    if (userId) {
      await this.refreshSessionRepo.update(
        { accountId: userId },
        { revokedAt: new Date() },
      );
    }
    return { success: true };
  }
}
