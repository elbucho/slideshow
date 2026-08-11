import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '@/users/users.module';
import { SessionsModule } from '@/sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from '@/auth/strategies/local.strategy';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '@/auth/strategies/jwt-refresh.strategy';
import { JwtLogoutStrategy } from '@/auth/strategies/jwt-logout.strategy';
import { AuditModule } from '@/audit/audit.module';

@Module({
    imports: [
        forwardRef(() => UsersModule),
        forwardRef(() => SessionsModule),
        forwardRef(() => AuditModule),
        PassportModule,
        JwtModule
    ],
    controllers: [ AuthController ],
    providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        JwtRefreshStrategy,
        JwtLogoutStrategy
    ],
    exports: [ AuthService ]
})
export class AuthModule {}
