import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.cookies?.accessToken || req?.cookies?.token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("app.jwt.secret"),
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.id) {
      throw new UnauthorizedException("Token không hợp lệ hoặc đã hết hạn");
    }

    return {
      id: payload.id,
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      email: payload.email,
    };
  }
}
