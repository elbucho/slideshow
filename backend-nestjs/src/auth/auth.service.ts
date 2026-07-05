import {
  Injectable,
  Inject,
  forwardRef,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { Providers } from "@/config";
import { ICryptProvider } from "@/auth/crypt.provider.interface";
import { ITokenProvider } from "@/auth/token.provider.interface";
import { TokenPayloadDto } from "@/auth/dto/token-payload.dto";
import { TokensDto } from "@/auth/dto/tokens.dto";
import { Response } from "express";
import { UserRecord } from "@/user/entities/user.entity";
import { SessionRecord } from "@/session/entities/session.entity";
import { UserService } from "@/user/user.service";
import { SessionService } from "@/session/session.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,

    @Inject(Providers.crypt)
    private readonly cryptProvider: ICryptProvider,

    @Inject(Providers.token)
    private readonly tokenProvider: ITokenProvider,

    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
  ) {}

  private getExpirationDate(expiresMs: number): Date {
    const now = new Date();
    const adjustedTime = now.getTime() + expiresMs;

    return new Date(adjustedTime);
  }

  async hash(value: string): Promise<string> {
    const hashRounds = +this.configService.get("BCRYPT_HASH_ROUNDS") || 10;

    return this.cryptProvider.hash(value, hashRounds);
  }

  async verifyHash(value: string, hash: string): Promise<boolean> {
    return this.cryptProvider.hashMatches(value, hash);
  }

  async createCookie(
    response: Response,
    name: string,
    expiresMs: number,
    token: string,
  ): Promise<void> {
    const expires = this.getExpirationDate(expiresMs);

    response.cookie(name, token, {
      httpOnly: true,
      secure: this.configService.get("NODE_ENV") === "production",
      expires: expires,
    });
  }

  async signToken(
    secret: string,
    timeoutMs: number,
    payload: TokenPayloadDto,
  ): Promise<string> {
    return this.tokenProvider.signToken(secret, timeoutMs, payload);
  }

  async verifyToken(token: string, userId: number): Promise<UserRecord> {
    let session: SessionRecord;

    try {
      session = await this.sessionService.getSessionByUserId(userId);
    } catch (err) {
      throw new UnauthorizedException("Invalid token");
    }

    if (!session.user) {
      throw new UnauthorizedException("Invalid token");
    }

    const authenticated = await this.verifyHash(
      token,
      session.tokenHash,
    );

    if (session.tokenExpiresAt < new Date() || !authenticated) {
      throw new UnauthorizedException("Invalid token");
    }

    return session.user;
  }

  async createAccessToken(
    payload: TokenPayloadDto,
    response: Response,
  ): Promise<string> {
    const timeoutMs = +this.configService.getOrThrow("JWT_ACCESS_TIMEOUT_MS");

    const token = await this.signToken(
      this.configService.getOrThrow("JWT_ACCESS_SECRET"),
      timeoutMs,
      payload,
    );

    await this.createCookie(response, "AccessToken", timeoutMs, token);

    return token;
  }

  async createRefreshToken(
    payload: TokenPayloadDto,
    response: Response,
  ): Promise<string> {
    const timeoutMs = +this.configService.getOrThrow("JWT_REFRESH_TIMEOUT_MS");

    const token = await this.signToken(
      this.configService.getOrThrow("JWT_REFRESH_SECRET"),
      timeoutMs,
      payload,
    );

    await this.createCookie(response, "RefreshToken", timeoutMs, token);

    return token;
  }

  async verifyUser(username: string, password: string): Promise<UserRecord> {
    let user: UserRecord;

    try {
      user = await this.userService.findByUsername(username);
    } catch (err) {
      throw new UnauthorizedException("Login credentials invalid");
    }

    const authenticated = await this.cryptProvider.hashMatches(
      password,
      user.password,
    );

    if (!authenticated) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async login(user: UserRecord, response: Response): Promise<TokensDto> {
    const payload: TokenPayloadDto = {
      userId: user.id,
    };

    const tokens: TokensDto = {
      accessToken: await this.createAccessToken(payload, response),
      refreshToken: await this.createRefreshToken(payload, response),
    };

    const tokenHash = await this.cryptProvider.hash(
      tokens.refreshToken,
      this.configService.getOrThrow("BCRYPT_HASH_ROUNDS")
    );

    await this.sessionService.getOrCreateSession(
      user.id,
      tokenHash,
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