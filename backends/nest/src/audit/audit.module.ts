import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditListener } from '@/listeners/audit/audit.listener';
import { AuditLog } from '@/database/entities/audit-log.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([AuditLog])
    ],
    providers: [
        AuditListener
    ],
    exports: []
})
export class AuditModule { }