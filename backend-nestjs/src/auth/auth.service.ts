import { Injectable, Inject, UnauthorizedException, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { UserService } from "src/user/user.service";
import { User } from "src/user/entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import { TokenPayloadDto } from "./dto/token-payload.dto";

@Injectable()
export class AuthService {
  constructor(
		private readonly configService: ConfigService,
		private readonly jwtService: JwtService,
		@Inject(forwardRef(() => UserService))
			private readonly userService: UserService,
	) {}

  hash(value: string): string {
    const hashRounds = +this.configService.get("BCRYPT_HASH_ROUNDS") || 10;

    return bcrypt.hashSync(value, hashRounds);
  }

	async verifyUser(username: string, password: string): Promise<User> {
		try {
			const user = await this.userService.getUserByUsername(username);
			const authenticated = await bcrypt.compare(password, user.password);

			if ( ! authenticated) {
				throw new UnauthorizedException();
			}

			return user;
		} catch (err) {
			throw new UnauthorizedException('Login credentials invalid');
		}
	}

	getExpirationDate(expiresMs: number): Date {
		const expires = new Date();
		expires.setMilliseconds(
			expires.getTime() + expiresMs
		);

		return expires;
	}

	createCookie(response: Response, tokenType: string, token: string): void {
		const expires = this.getExpirationDate(
			+this.configService.getOrThrow(`JWT_${tokenType}_TIMEOUT_MS`)
		);

		response.cookie(tokenType.toLowerCase(), token, {
			httpOnly: true,
			secure: this.configService.get('NODE_ENV') === 'production',
			expires: expires
		});
	}

	createToken(tokenType: string, payload: TokenPayloadDto): string {
		const secret = this.configService.getOrThrow(`JWT_${tokenType}_SECRET`);
		const timeout = this.configService.getOrThrow(`JWT_${tokenType}_TIMEOUT_MS`);

		return this.jwtService.sign(payload, {
			secret: secret,
			expiresIn: `${timeout}ms`
		});
	}

	async login(user: User, response: Response): Promise<void> {
		const payload: TokenPayloadDto = {
			userId: user.id
		};

		this.createCookie(
			response, 
			'ACCESS',
			this.createToken('ACCESS', payload)
		);

		this.createCookie(
			response,
			'REFRESH',
			this.createToken('REFRESH', payload)
		);
	}

	async logout(response: Response): Promise<boolean> {
		response.clearCookie('access');
		response.clearCookie('refresh');

		return true;
	}
}
