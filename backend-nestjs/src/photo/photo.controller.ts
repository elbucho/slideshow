import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { PhotoService } from "@/photo/photo.service";
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { CurrentUser } from "@/auth/current-user.decorator";
import { UserRecord } from "@/user/entities/user.entity";
import { PersonRecord } from "@/person/entities/person.entity";
import { PhotoRecord } from "@/photo/entities/photo.entity";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";

@UseGuards(JwtAuthGuard)
@Controller("photos")
export class PhotoController {
  constructor(@Inject(PhotoService) private photoService: PhotoService) {}

  @ApiCreatedResponse({
    description: "Photo created successfully",
  })
  @ApiUnauthorizedResponse()
  @Post()
  @UseInterceptors(FileInterceptor("photo"))
  async create(
    @UploadedFile() photo: Express.Multer.File,
    @CurrentUser() user: UserRecord
  ): Promise<PhotoRecord> {
    return this.photoService.createPhoto(user.id, { data: photo.buffer });
  }

  @ApiOkResponse({
    description: "Photos found",
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({
    description: "No photos matching criteria found",
  })
  @Get()
  async findPhotos(@CurrentUser() user: UserRecord): Promise<PhotoRecord[]> {
    return this.photoService.getPhotosByUser(user.id, false);
  }

  @ApiOkResponse({
    description: "Photo found",
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({
    description: "No photo matching criteria found",
  })
  @Get(":id")
  async getPhoto(
    @Param("id") id: string,
    @CurrentUser() user: UserRecord,
    @Res() res: Response,
  ): Promise<PersonRecord> {
    const photo = await this.photoService.getPhoto(+id, false);

    if (photo.userId === user.id) {
      res.set({
        "Content-Type": "image/png",
        "Content-Length": photo.data.length,
      });

      res.send(photo.data);
    }

    throw new UnauthorizedException();
  }

  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({
    description: "No photo matching criteria found",
  })
  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: UserRecord,
  ): Promise<void> {
    const photo = await this.photoService.getPhoto(+id, false);

    if (photo.userId === user.id) {
      return this.photoService.deletePhoto(photo);
    }

    throw new UnauthorizedException();
  }
}
