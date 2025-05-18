import { ConfigService } from "@nestjs/config";
import { UserService } from "src/user/user.service";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TokenPayloadDto } from "../dto/token-payload.dto";
import { User } from "src/user/entities/user.entity";
import { Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		configService: ConfigService,
		private readonly userService: UserService
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request: Request) => request.cookies?.access
			]),
			secretOrKey: configService.getOrThrow('JWT_ACCESS_SECRET')
		});
	}

	async validate(payload: TokenPayloadDto): Promise<User> {
		try {
			const user = await this.userService.findById(payload.userId);

			return user;
		} catch (err) {
			throw new UnauthorizedException;
		}
	}
}