import { Controller, Post, Res, UseGuards } from "@nestjs/common";
import { LocalAuthGuard } from "@/auth/guards/local-auth.guard";
import { CurrentUser } from "@/auth/current-user.decorator";
import { UserRecord } from "@/user/entities/user.entity";
import { Response } from "express";
import { AuthService } from "@/auth/auth.service";
import {
  ApiBody,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import { LoginRequestDto } from "@/auth/dto/login-request.dto";
import { JwtRefreshAuthGuard } from "@/auth/guards/jwt-refresh-auth.guard";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { TokensDto } from "@/auth/dto/tokens.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiBody({ type: LoginRequestDto })
  @ApiCreatedResponse({
    description: "Login successful",
  })
  @ApiUnauthorizedResponse({
    description: "Login credentials invalid",
  })
  @UseGuards(LocalAuthGuard)
  async login(
    @CurrentUser() user: UserRecord,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokensDto> {
    return this.authService.login(user, response);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({
    description: "User logged out",
  })
  async logout(
    @CurrentUser() user: UserRecord,
    @Res({ passthrough: true }) response: Response,
  ): Promise<boolean> {
    return this.authService.logout(user, response);
  }

  @Post("refresh")
  @UseGuards(JwtRefreshAuthGuard)
  @ApiCreatedResponse({
    description: "New auth tokens issued",
  })
  async refreshToken(
    @CurrentUser() user: UserRecord,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokensDto> {
    return this.authService.login(user, response);
  }
}
