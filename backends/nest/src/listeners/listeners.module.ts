import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { UsersModule } from '@/users/users.module';
import { AuditListener } from '@/listeners/audit/audit.listener';
import { LogListener } from '@/listeners/log/log.listener';
import { UserStateListener } from '@/listeners/state/user-state.listener';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AuditLog
        ]),
        UsersModule
    ],
    providers: [
        AuditListener,
        LogListener,
        UserStateListener
    ]
})
export class ListenersModule {}