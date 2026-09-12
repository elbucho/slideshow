import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AccessStrategy } from './strategies/access.strategy';
import { CredentialsStrategy } from './strategies/credentials.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { StateStrategy } from './strategies/state.strategy';
import { AccessGuard } from './guards/access.guard';
import { CredentialsGuard } from './guards/credentials.guard';
import { RefreshGuard } from './guards/refresh.guard';
import { SessionsGuard } from './guards/sessions.guard';
import { StateGuard } from './guards/state.guard';
import { AuditModule } from '@/audit/audit.module';
import { StateModule } from '@/states/state.module';
import { CryptModule } from '@/crypt/crypt.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '@/database/entities/session.entity';
import { User } from '@/database/entities/user.entity';
import { UserState } from '@/database/entities/user-state.entity';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { QueryBuilderFactory } from '@/database/queries/query.builder';
import { SecurityService } from '@/auth/security/security.service';

@Module({
    imports: [
        JwtModule.register({}),
        TypeOrmModule.forFeature([
            Session,
            User,
            UserState,
            AuditLog
        ]),
        AuditModule,
        StateModule,
        CryptModule
    ],
    providers: [
        SecurityService,
        AccessStrategy,
        CredentialsStrategy,
        RefreshStrategy,
        StateStrategy,
        AccessGuard,
        CredentialsGuard,
        RefreshGuard,
        SessionsGuard,
        StateGuard,
        {
            provide: APP_GUARD,
            useClass: AccessGuard
        },
        QueryBuilderFactory
    ],
    exports: [
        AccessGuard,
        CredentialsGuard,
        RefreshGuard,
        SessionsGuard,
        StateGuard
    ]
})
export class SecurityModule {}