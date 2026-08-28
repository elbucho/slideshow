import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '@/users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StateStrategy } from '@/auth/strategies/state.strategy';
import { RefreshStrategy } from '@/auth/strategies/refresh.strategy';
import { CredentialsStrategy } from '@/auth/strategies/credentials.strategy';
import { AccessStrategy } from '@/auth/strategies/access.strategy';
import { StateModule } from '@/states/state.module';
import { TokensModule } from '@/tokens/tokens.module';
import { AccessGuard } from '@/auth/guards/access.guard';

@Module({
    imports: [
        UsersModule,
        SessionsModule,
        StateModule,
        TokensModule,
        PassportModule
    ],
    controllers: [ AuthController ],
    providers: [
        AuthService,
        StateStrategy,
        RefreshStrategy,
        CredentialsStrategy,
        AccessStrategy,
        {
            provide: APP_GUARD,
            useClass: AccessGuard
        }
    ],
    exports: [ AuthService ]
})
export class AuthModule {}
