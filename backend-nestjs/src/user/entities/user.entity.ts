import {
  Column,
  Model,
  Table,
  Length,
  DataType,
  HasOne, HasMany
} from "sequelize-typescript";
import { Optional } from "sequelize";
import { Session } from "@/session/entities/session.entity";
import { Person } from "@/person/entities/person.entity";
import { Photo } from "@/photo/entities/photo.entity";

export interface UserRecord {
  id: number;
  username: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  session?: Session;
  people?: Person[];
  photos?: Photo[];
}

@Table({ tableName: "users", paranoid: true, timestamps: true })
export class User extends Model<
  UserRecord,
  Optional<UserRecord, "id">
> {
  @Length({ min: 1, max: 32 })
  @Column({
    unique: true,
    type: DataType.STRING(32),
  })
  declare username: string;

  @Column
  declare password: string;

  @HasOne(() => Session)
  declare session: Session;

  @HasMany(() => Person)
  declare people: Person[];

  @HasMany(() => Photo)
  declare photos: Photo[];
}
