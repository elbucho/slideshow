import { Inject, Injectable } from '@nestjs/common';
import { Providers } from "@/config";
import { IPhotoProvider } from "@/photo/photo.provider.interface";
import { PhotoRecord } from "@/photo/entities/photo.entity";
import { CreatePhotoDto } from "@/photo/dto/create-photo.dto";

@Injectable()
export class PhotoService {
  constructor(
    @Inject(Providers.photo)
    private readonly photoProvider: IPhotoProvider,
  ) {}

  async getPhoto(id: number, includeDeleted: boolean): Promise<PhotoRecord> {
    return this.photoProvider.getPhoto(id, includeDeleted);
  }

  async getPhotosByUser(userId: number, includeDeleted: boolean = false): Promise<PhotoRecord[]> {
    return this.photoProvider.findPhotosByUserId(userId, includeDeleted);
  }

  async createPhoto(userId: number, photoDto: CreatePhotoDto): Promise<PhotoRecord> {
    return this.photoProvider.addPhoto(userId, photoDto);
  }

  async deletePhoto(photo: PhotoRecord): Promise<void> {
    return this.photoProvider.deletePhoto(photo);
  }
}
