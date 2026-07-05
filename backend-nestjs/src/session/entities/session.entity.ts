import {
  Column,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import { User, UserRecord } from "@/user/entities/user.entity";

export interface SessionRecord {
  id: number;
  userId: number;
  tokenHash: string;
  tokenExpiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  user?: UserRecord;
}

@Table({ tableName: "sessions", timestamps: true })
export class Session extends Model<
  SessionRecord,
  Optional<SessionRecord, "id">
> {
  @ForeignKey(() => User)
  @Column
  userId!: number;

  @BelongsTo(() => User)
  user!: User;

  @Column
  tokenHash!: string;

  @Column
  tokenExpiresAt!: Date;
}
