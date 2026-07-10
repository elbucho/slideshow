import { ConfigService } from "@nestjs/config";
import { AuthService } from "@/auth/auth.service";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TokenPayloadDto } from "@/auth/dto/token-payload.dto";
import { UserRecord } from "@/user/entities/user.entity";
import { Injectable } from "@nestjs/common";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
				(request: Request) => request.cookies?.RefreshToken
      ]),
      secretOrKey: configService.getOrThrow("JWT_REFRESH_SECRET"),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: TokenPayloadDto): Promise<UserRecord> {
		const auth = request.headers.authorization;
		const token: string = auth && auth.includes('Bearer') ?
			auth.split(' ')[1] :
			request.cookies?.RefreshToken;

		return await this.authService.verifyToken(token, payload.userId);
  }
}
