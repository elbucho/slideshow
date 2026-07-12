import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { PeoplePhotos } from "@/pivots/entities/people.photos.entity";

@Module({
  imports: [
    ...(process.env.NODE_ENV === "test"
      ? []
      : [SequelizeModule.forFeature([PeoplePhotos])]),
  ],
})
export class PeoplePhotosModule {}
