import { Module, forwardRef } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "./strategies/local.strategy";
import { UserModule } from "src/user/user.module";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
	imports: [
		forwardRef(() => UserModule), 
		PassportModule, 
		JwtModule
	],
  providers: [
		AuthService, 
		LocalStrategy,
		JwtStrategy
	],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
