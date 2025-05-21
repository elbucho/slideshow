import {
  Column,
  Model,
  Table,
  Length,
  DataType,
  HasOne,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import { Session } from "src/session/entities/session.entity";

interface UserAttributes {
  id: number;
  username: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

@Table({ tableName: "users", paranoid: true, timestamps: true })
export class User extends Model<
  UserAttributes,
  Optional<UserAttributes, "id">
> {
  @Length({ min: 1, max: 32 })
  @Column({
    unique: true,
    type: DataType.STRING(32),
  })
  username: string;

  @Column
  password: string;

  @HasOne(() => Session)
  session: Session;
}
