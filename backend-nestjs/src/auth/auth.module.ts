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
import { CryptProviderBcrypt } from "@/auth/crypt.provider.bcrypt";
import { TokenProviderJwt } from "@/auth/token.provider.jwt";
import { Providers } from "@/config";

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => SessionModule),
    PassportModule,
    JwtModule,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    {
      provide: Providers.crypt,
      useClass: CryptProviderBcrypt
    },
    {
      provide: Providers.token,
      useClass: TokenProviderJwt
    }
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
