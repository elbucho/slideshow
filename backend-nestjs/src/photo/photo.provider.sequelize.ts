import { IPhotoProvider } from "@/photo/photo.provider.interface";
import { CreatePhotoDto } from "@/photo/dto/create-photo.dto";
import { Photo, PhotoRecord } from "@/photo/entities/photo.entity";
import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";

@Injectable()
export class PhotoProviderSequelize implements IPhotoProvider {
  constructor(@InjectModel(Photo) private readonly photoEntity: typeof Photo) {}

  private async getPhotoRecord(
    id: number,
    includeDeleted: boolean = false,
  ): Promise<Photo> {
    const photo = await this.photoEntity.findByPk(id, {
      paranoid: !includeDeleted,
    });

    if (!photo) {
      throw new NotFoundException("Photo not found");
    }

    return photo;
  }

  async addPhoto(
    userId: number,
    photoDto: CreatePhotoDto,
  ): Promise<PhotoRecord> {
    const photo = await this.photoEntity.create({
      ...photoDto,
      userId: userId,
    });

    return photo.toJSON();
  }

  async deletePhoto(photo: PhotoRecord): Promise<void> {
    const existingPhoto = await this.getPhotoRecord(photo.id, false);

    return existingPhoto.destroy();
  }

  async findPhotosByUserId(
    userId: number,
    includeDeleted: boolean,
  ): Promise<PhotoRecord[]> {
    let photos: PhotoRecord[] = [];

    const foundPhotos = await this.photoEntity.findAll({
      where: {
        userId: userId,
      },
      paranoid: !includeDeleted,
    });

    foundPhotos.forEach(photo => { photos.push(photo.toJSON()); });

    return photos;
  }

  async getPhoto(id: number, includeDeleted: boolean): Promise<PhotoRecord> {
    const photo = await this.getPhotoRecord(id, includeDeleted);

    return photo.toJSON();
  }
}