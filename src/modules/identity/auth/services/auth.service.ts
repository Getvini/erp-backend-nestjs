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

export const SESSION_EXPIRED_CODE = "SESSION_EXPIRED";
const ACCESS_TOKEN_TTL_SECONDS = 2 * 60 * 60; // 2 giờ
const DEFAULT_REFRESH_TTL_SECONDS = 24 * 60 * 60; // 1 ngày
const REMEMBER_REFRESH_TTL_SECONDS = 30 * DEFAULT_REFRESH_TTL_SECONDS; // 30 ngày

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
        "Tên đăng nhập hoặc mật khẩu không chính xác",
      );
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw new UnauthorizedException(
        "Tên đăng nhập hoặc mật khẩu không chính xác",
      );
    }

    if (!account.isActive || account.user?.isLocked) {
      throw new UnauthorizedException(
        "Tài khoản đã bị tạm khóa hoặc ngừng hoạt động",
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
    const refreshTtlSeconds = rememberMe
      ? REMEMBER_REFRESH_TTL_SECONDS
      : DEFAULT_REFRESH_TTL_SECONDS;
    const accessMaxAge = ACCESS_TOKEN_TTL_SECONDS * 1000;
    const refreshMaxAge = refreshTtlSeconds * 1000;

    const refreshSecret =
      this.configService.get<string>("app.jwt.refreshSecret") ||
      this.configService.get<string>("app.jwt.secret");

    const refreshToken = jwt.sign(
      { id: account.id, sessionId, type: "refresh" },
      refreshSecret,
      { expiresIn: `${refreshTtlSeconds}s` },
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
      throw new UnauthorizedException({
        code: SESSION_EXPIRED_CODE,
        message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
      });
    }

    const refreshSecret =
      this.configService.get<string>("app.jwt.refreshSecret") ||
      this.configService.get<string>("app.jwt.secret");

    if (!refreshSecret) {
      throw new UnauthorizedException(
        "Khóa bí mật xác thực chưa được cấu hình",
      );
    }

    let payload: any;
    try {
      payload = jwt.verify(rawRefreshToken, refreshSecret);
    } catch {
      throw new UnauthorizedException({
        code: SESSION_EXPIRED_CODE,
        message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
      });
    }

    if (!payload || payload.type !== "refresh" || !payload.sessionId) {
      throw new UnauthorizedException({
        code: SESSION_EXPIRED_CODE,
        message: "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại",
      });
    }

    const incomingTokenHash = crypto
      .createHash("sha256")
      .update(rawRefreshToken)
      .digest("hex");

    const result = await this.refreshSessionRepo.manager.transaction(
      async (manager) => {
        const sessionRepo = manager.getRepository(RefreshSessions);

        // Pessimistic write lock trên sessionId để chống race condition
        const lockedSession = await sessionRepo
          .createQueryBuilder("session")
          .where("session.id = :sessionId", { sessionId: payload.sessionId })
          .setLock("pessimistic_write")
          .getOne();

        if (!lockedSession) return null;

        const session = await sessionRepo.findOne({
          where: { id: lockedSession.id },
          relations: ["account", "account.user"],
        });

        if (
          !session ||
          session.revokedAt ||
          session.expiresAt.getTime() <= Date.now()
        ) {
          return null;
        }

        // Phát hiện Replay Attack / Token Reuse: Nếu hash hoặc accountId không khớp
        if (
          session.accountId !== payload.id ||
          session.tokenHash !== incomingTokenHash
        ) {
          session.revokedAt = new Date();
          await sessionRepo.save(session);
          return null;
        }

        const account = session.account;
        if (!account || !account.isActive || account.user?.isLocked) {
          session.revokedAt = new Date();
          await sessionRepo.save(session);
          return null;
        }

        const remainingSeconds = Math.floor(
          (session.expiresAt.getTime() - Date.now()) / 1000,
        );
        if (remainingSeconds <= 0) {
          return null;
        }

        const accessPayload = {
          id: account.id,
          userId: account.userId || account.user?.id,
          username: account.username,
          role: account.role,
          email: account.email,
          type: "access",
        };

        const newAccessToken = this.jwtService.sign(accessPayload);

        // Giữ nguyên session.id (KHÔNG sinh newSessionId mới làm lệch ID với DB)
        // và cấp token mới với đúng thời gian còn lại của session
        const newRefreshToken = jwt.sign(
          { id: account.id, sessionId: session.id, type: "refresh" },
          refreshSecret,
          { expiresIn: `${remainingSeconds}s` },
        );

        const newTokenHash = crypto
          .createHash("sha256")
          .update(newRefreshToken)
          .digest("hex");

        session.tokenHash = newTokenHash;
        await sessionRepo.save(session);

        return {
          token: newAccessToken,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          accessMaxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
          refreshMaxAge: remainingSeconds * 1000,
          user: {
            id: account.user?.id || account.id,
            accountId: account.id,
            userId: account.userId || account.user?.id,
            username: account.username,
            role: account.role,
            fullName: account.user?.fullName,
          },
        };
      },
    );

    if (!result) {
      throw new UnauthorizedException({
        code: SESSION_EXPIRED_CODE,
        message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
      });
    }

    return result;
  }

  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      try {
        const decoded = jwt.decode(rawRefreshToken) as any;
        if (decoded && decoded.sessionId) {
          await this.refreshSessionRepo.update(
            { id: decoded.sessionId },
            { revokedAt: new Date() },
          );
          return { success: true, message: "Đăng xuất thành công" };
        }
      } catch {
        // Fallback sang tokenHash nếu không decode được
      }

      const tokenHash = crypto
        .createHash("sha256")
        .update(rawRefreshToken)
        .digest("hex");
      await this.refreshSessionRepo.update(
        { tokenHash },
        { revokedAt: new Date() },
      );
    }
    return { success: true, message: "Đăng xuất thành công" };
  }
}
