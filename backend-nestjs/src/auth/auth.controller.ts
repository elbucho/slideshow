import { Controller, Post, Res, UseGuards } from "@nestjs/common";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { User } from "src/user/entities/user.entity";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { ApiBody, ApiUnauthorizedResponse, ApiOkResponse, ApiCreatedResponse } from "@nestjs/swagger";
import { LoginRequestDto } from "./dto/login-request.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

	@Post('login')
	@ApiBody({ type: LoginRequestDto })
	@ApiCreatedResponse({
		description: "Login successful",
	})
	@ApiUnauthorizedResponse({
		description: "Login credentials invalid"
	})	
	@UseGuards(LocalAuthGuard)
	async login(
		@CurrentUser() user: User,
		@Res({ passthrough: true }) response: Response
	) {
		await this.authService.login(user, response);
	}

	@Post('logout')
	@ApiCreatedResponse()
	async logout(
		@Res({ passthrough: true }) response: Response
	): Promise<void> {
		await this.authService.logout(response);
	}
}
