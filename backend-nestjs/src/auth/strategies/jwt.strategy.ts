import { ConfigService } from "@nestjs/config";
import { UserService } from "@/user/user.service";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TokenPayloadDto } from "@/auth/dto/token-payload.dto";
import { UserRecord } from "@/user/entities/user.entity";
import { Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => request.cookies?.AccessToken
      ]),
      secretOrKey: configService.getOrThrow("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: TokenPayloadDto): Promise<UserRecord> {
		try {
      return await this.userService.findById(payload.userId);
    } catch (err) {
      throw new UnauthorizedException();
    }
  }
}
