import { Column, Model, Table, Length, DataType } from "sequelize-typescript";

@Table({ tableName: "users", paranoid: true, timestamps: true })
export class User extends Model {
  @Length({ min: 1, max: 32 })
  @Column({
    unique: true,
    type: DataType.STRING(32),
  })
  username: string;

  @Column
  password: string;
}
