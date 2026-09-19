import {
    DeleteDateColumn,
    UpdateDateColumn
} from 'typeorm';
import { BaseEntity } from './base.entity';

export class SoftDeleteEntity extends BaseEntity {
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date|null;
}