import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Request, Response } from "express";
import { AuthService } from "@modules/identity/auth/services/auth.service";
import { LoginDto, RefreshTokenDto } from "@modules/identity/auth/dto/auth.dto";
import { Public } from "@core/decorators/public.decorator";
import { CurrentUser } from "@core/decorators/current-user.decorator";

@ApiTags("Identity - Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getCookieOptions(req: Request) {
    const origin = req.get("origin") ?? "";
    const forwardedProto = req.get("x-forwarded-proto") ?? "";
    const isHttpsRequest = req.secure || forwardedProto.includes("https");
    const isLocalOrigin = /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i.test(
      origin,
    );

    if (!isHttpsRequest || isLocalOrigin) {
      return {
        httpOnly: true,
        secure: false,
        sameSite: "lax" as const,
        path: "/",
      };
    }

    return {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    };
  }

  private setAuthCookies(
    res: Response,
    result: {
      accessToken: string;
      refreshToken: string;
      accessMaxAge: number;
      refreshMaxAge: number;
    },
    req: Request,
  ) {
    const options = this.getCookieOptions(req);
    res.cookie("accessToken", result.accessToken, {
      ...options,
      maxAge: result.accessMaxAge,
    });
    res.cookie("refreshToken", result.refreshToken, {
      ...options,
      maxAge: result.refreshMaxAge,
    });
  }

  private clearAuthCookies(res: Response, req: Request) {
    const options = this.getCookieOptions(req);
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Đăng nhập vào hệ thống ERP" })
  @ApiResponse({
    status: 200,
    description: "Đăng nhập thành công, trả về token",
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setAuthCookies(res, result, req);
    return {
      message: "Đăng nhập thành công",
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cấp phát access token mới qua refresh token" })
  @ApiResponse({ status: 200, description: "Lấy token mới thành công" })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = refreshTokenDto?.refreshToken || req.cookies?.refreshToken;
    const result = await this.authService.refreshToken(rawToken);
    this.setAuthCookies(res, result, req);
    return {
      message: "Làm mới phiên đăng nhập thành công",
      token: result.accessToken,
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Đăng xuất khỏi hệ thống" })
  @ApiResponse({ status: 200, description: "Đăng xuất thành công" })
  async logout(
    @CurrentUser("id") accountId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearAuthCookies(res, req);
    return this.authService.logout(accountId);
  }
}
