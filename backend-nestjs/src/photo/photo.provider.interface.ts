import { PhotoRecord } from "@/photo/entities/photo.entity";
import { CreatePhotoDto } from "@/photo/dto/create-photo.dto";

export interface IPhotoProvider {
  getPhoto(id: number, includeDeleted: boolean): Promise<PhotoRecord>;
  findPhotosByUserId(userId: number, includeDeleted: boolean): Promise<PhotoRecord[]>;
  addPhoto(userId: number, photoDto: CreatePhotoDto): Promise<PhotoRecord>;
  deletePhoto(photo: PhotoRecord): Promise<void>;
}