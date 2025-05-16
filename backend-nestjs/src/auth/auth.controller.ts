import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
	constructor(private configService: ConfigService) {}

	@Get()
	getAuth() {
		console.log(this.configService.get<string>('TESTVAR'))
	}

}
