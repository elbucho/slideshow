import { AbstractProviderFake } from '@test/providers/abstract.provider.fake';
import { IPhotoProvider } from '@/photo/photo.provider.interface';
import { PhotoRecord } from '@/photo/entities/photo.entity';
import { CreatePhotoDto } from '@/photo/dto/create-photo.dto';

export class PhotoProviderFake extends AbstractProviderFake<PhotoRecord> implements IPhotoProvider {
  async addPhoto(userId: number, photoDto: CreatePhotoDto): Promise<PhotoRecord> {
    return this.createRecord({
      userId: userId,
      ...photoDto
    });
  }

  async deletePhoto(photo: PhotoRecord): Promise<void> {
    return this.deleteRecord(photo);
  }

  async findPhotosByUserId(userId: number, includeDeleted: boolean): Promise<PhotoRecord[]> {
    let photos: PhotoRecord[] = [];

    this.records.find((photo): void => {
      if (photo.userId === userId) {
        if (!photo.deletedAt || includeDeleted) {
          photos.push(photo);
        }
      }
    });

    return photos;
  }

  async getPhoto(id: number, includeDeleted: boolean): Promise<PhotoRecord> {
    return this.findRecord(id, includeDeleted);
  }
}