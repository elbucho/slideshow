import { Module, forwardRef } from "@nestjs/common";
import { AuthService } from "@/auth/auth.service";
import { AuthController } from "@/auth/auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "@/auth/strategies/local.strategy";
import { UserModule } from "@/user/user.module";
import { SessionModule } from "@/session/session.module";
import { JwtStrategy } from "@/auth/strategies/jwt.strategy";
import { JwtRefreshStrategy } from "@/auth/strategies/jwt-refresh.strategy";

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => SessionModule),
    PassportModule,
    JwtModule,
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
