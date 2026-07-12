import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  Table,
} from "sequelize-typescript";
import { Person } from "@/person/entities/person.entity";
import { Photo } from "@/photo/entities/photo.entity";

@Table({ tableName: "people_photos", paranoid: true, timestamps: true })
export class PeoplePhotos extends Model {
  @ForeignKey(() => Person)
  @Column
  declare personId: number;

  @ForeignKey(() => Photo)
  @Column
  declare photoId: number;
  
  @BelongsTo(() => Person)
  declare person: Person;

  @BelongsTo(() => Photo)
  declare photo: Photo;
}