import { Module } from '@nestjs/common';
import { SequelizeModule } from "@nestjs/sequelize";
import { Photo } from "@/photo/entities/photo.entity";
import { PhotoController } from "@/photo/photo.controller";
import { PhotoService } from "@/photo/photo.service";
import { PhotoProviderSequelize } from "@/photo/photo.provider.sequelize";
import { Providers } from "@/config";

@Module({
  imports: [
    ...(process.env.NODE_ENV === "test"
      ? []
      : [SequelizeModule.forFeature([Photo])]),
  ],
  controllers: [PhotoController],
  providers: [
    PhotoService,
    {
      provide: Providers.photo,
      useClass: PhotoProviderSequelize
    }
  ],
  exports: [PhotoService]
})
export class PhotoModule {}
