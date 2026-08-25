import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '@/users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StateStrategy } from '@/auth/strategies/state.strategy';
import { RefreshStrategy } from '@/auth/strategies/refresh.strategy';
import { CredentialsStrategy } from '@/auth/strategies/credentials.strategy';
import { AccessStrategy } from '@/auth/strategies/access.strategy';
import { AuditModule } from '@/audit/audit.module';
import { StateModule } from '@/states/state.module';

@Module({
    imports: [
        forwardRef(() => UsersModule),
        forwardRef(() => SessionsModule),
        forwardRef(() => AuditModule),
        forwardRef(() => StateModule),
        PassportModule,
        JwtModule
    ],
    controllers: [ AuthController ],
    providers: [
        AuthService,
        StateStrategy,
        RefreshStrategy,
        CredentialsStrategy,
        AccessStrategy
    ],
    exports: [ AuthService ]
})
export class AuthModule {}
