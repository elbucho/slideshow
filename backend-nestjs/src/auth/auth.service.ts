import {
  Injectable,
  Inject,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { UserService } from "@/user/user.service";
import { UserRecord } from "@/user/entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import { TokenPayloadDto } from "@/auth/dto/token-payload.dto";
import { SessionService } from "@/session/session.service";
import { TokensDto } from "@/auth/dto/tokens.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
  ) {}

  hash(value: string): string {
    const hashRounds = +this.configService.get("BCRYPT_HASH_ROUNDS") || 10;

    return bcrypt.hashSync(value, hashRounds);
  }

  async verifyUser(username: string, password: string): Promise<UserRecord> {
    try {
      const user = await this.userService.findByUsername(username);
      const authenticated = await bcrypt.compare(password, user.password);

      if (!authenticated) {
        throw new UnauthorizedException();
      }

      return user;
    } catch (err) {
      throw new UnauthorizedException("Login credentials invalid");
    }
  }

  async verifyRefreshToken(token: string, userId: number): Promise<UserRecord> {
    try {
      const session = await this.sessionService.getSessionByUserId(userId);
      const authenticated = await bcrypt.compare(token, session.tokenHash);

      if (session.tokenExpiresAt < new Date() || !authenticated) {
        throw new UnauthorizedException();
      }

      return session.user.toJSON();
    } catch (err) {
      throw new UnauthorizedException();
    }
  }

  getExpirationDate(expiresMs: number): Date {
    const now = new Date();
    const adjustedTime = now.getTime() + expiresMs;

    return new Date(adjustedTime);
  }

  createCookie(
    response: Response,
    name: string,
    expiresMs: number,
    token: string,
  ): void {
    const expires = this.getExpirationDate(expiresMs);

    response.cookie(name, token, {
      httpOnly: true,
      secure: this.configService.get("NODE_ENV") === "production",
      expires: expires,
    });
  }

  createToken(
    secret: string,
    timeoutMs: number,
    payload: TokenPayloadDto,
  ): string {
    return this.jwtService.sign(payload, {
      secret: secret,
      expiresIn: `${timeoutMs}ms`,
    });
  }

  createAccessToken(payload: TokenPayloadDto, response: Response): string {
    const timeoutMs = +this.configService.getOrThrow("JWT_ACCESS_TIMEOUT_MS");

    const token = this.createToken(
      this.configService.getOrThrow("JWT_ACCESS_SECRET"),
      timeoutMs,
      payload,
    );

    this.createCookie(response, "AccessToken", timeoutMs, token);

    return token;
  }

  createRefreshToken(payload: TokenPayloadDto, response: Response): string {
    const timeoutMs = +this.configService.getOrThrow("JWT_REFRESH_TIMEOUT_MS");

    const token = this.createToken(
      this.configService.getOrThrow("JWT_REFRESH_SECRET"),
      timeoutMs,
      payload,
    );

    this.createCookie(response, "RefreshToken", timeoutMs, token);

    return token;
  }

  async login(user: UserRecord, response: Response): Promise<TokensDto> {
    const payload: TokenPayloadDto = {
      userId: user.id,
    };

    const tokens: TokensDto = {
      accessToken: this.createAccessToken(payload, response),
      refreshToken: this.createRefreshToken(payload, response),
    };

    await this.sessionService.getOrCreateSession(
      user.id,
      tokens.refreshToken,
      this.getExpirationDate(
        +this.configService.getOrThrow("JWT_REFRESH_TIMEOUT_MS"),
      ),
    );

    return tokens;
  }

  async logout(user: UserRecord, response: Response): Promise<boolean> {
    await this.sessionService.deleteSession(user.id);

    response.clearCookie("AccessToken");
    response.clearCookie("RefreshToken");

    return true;
  }
}
