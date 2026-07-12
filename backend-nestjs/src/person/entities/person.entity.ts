import {
  Column,
  Model,
  Table,
  Length,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import { IsNotEmpty } from "class-validator";
import { User, UserRecord } from "@/user/entities/user.entity";
import { Photo, PhotoRecord } from "@/photo/entities/photo.entity";
import { PeoplePhotos } from "@/pivots/entities/people.photos.entity";

export interface PersonRecord {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  user?: UserRecord;
  photos?: PhotoRecord[];
}

@Table({
  tableName: "people",
  paranoid: true,
  timestamps: true,
  indexes: [
    {
      name: "firstName-lastName-idx",
      fields: ["firstName", "lastName"],
      type: "FULLTEXT",
    },
  ],
})
export class Person extends Model<PersonRecord, Optional<PersonRecord, "id">> {
  @ForeignKey(() => User)
  @Column
  declare userId: number;

  @BelongsTo(() => User, 'userId')
  declare user?: User;

  @BelongsToMany(() => Photo, () => PeoplePhotos)
  declare photos?: Photo[];

  @Length({ min: 1, max: 32 })
  @Column({ type: DataType.STRING(32) })
  @IsNotEmpty()
  declare firstName: string;

  @Length({ min: 1, max: 32 })
  @Column({ type: DataType.STRING(32) })
  @IsNotEmpty()
  declare lastName: string;
}