import {
  Column,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import { User } from "src/user/entities/user.entity";

interface SessionAttributes {
  id: number;
  userId: number;
  tokenHash: string;
  tokenExpiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

@Table({ tableName: "sessions", timestamps: true })
export class Session extends Model<
  SessionAttributes,
  Optional<SessionAttributes, "id">
> {
  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column
  tokenHash: string;

  @Column
  tokenExpiresAt: Date;
}
