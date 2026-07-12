import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Optional } from "sequelize";
import { User, UserRecord } from "@/user/entities/user.entity";

export interface PhotoRecord {
  id: number;
  userId: number;
  data: Buffer;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  user?: UserRecord;
}

@Table({ tableName: "photos", paranoid: true, timestamps: true })
export class Photo extends Model<PhotoRecord, Optional<PhotoRecord, "id">> {
  @ForeignKey(() => User)
  @Column
  declare userId: number;

  @BelongsTo(() => User, "userId")
  declare user?: User;

  @Column({ type: DataType.BLOB('long') })
  declare data: Buffer;
}