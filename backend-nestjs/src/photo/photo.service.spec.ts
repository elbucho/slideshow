import { Test, TestingModule } from '@nestjs/testing';
import { PhotoService } from './photo.service';
import { Providers } from "@/config";
import { PhotoProviderFake } from "@test/providers/photo.provider.fake";
import { createPhoto } from "@test/test-utils";

describe('PhotoService', () => {
  let service: PhotoService;
  const photoProvider = new PhotoProviderFake();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotoService,
        {
          provide: Providers.photo,
          useValue: photoProvider,
        }
      ],
    }).compile();

    service = module.get<PhotoService>(PhotoService);
  });

  beforeEach(async () => {
    const png = createPhoto(
      { width: 100, height: 100 },
      { red: 255, green: 0, blue: 0, alpha: 255 },
    );

    photoProvider.clear();
    photoProvider.seed([
      {
        id: 1,
        userId: 1,
        data: png,
        createdAt: new Date()
      }
    ])
  })

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a photo', async () => {
    const png = createPhoto(
      { width: 100, height: 100},
      { red: 0, green: 255, blue: 0, alpha: 255 }
    );
    const photo = await service.createPhoto(1, { data: png });

    expect(photo).toBeDefined();
    expect(typeof(photo.id)).toBe('number');
    expect(photo.createdAt).toBeInstanceOf(Date);
  });

  it('should get a photo', async () => {
    const photo = await service.getPhoto(1, false);

    expect(photo).toBeDefined();
    expect(photo.id).toBe(1);
  });

  it('should get all photos by a given user id', async () => {
    const png = createPhoto(
      { width: 100, height: 100 },
      { red: 0, green: 255, blue: 0, alpha: 255 },
    );

    await service.createPhoto(1, { data: png });
    const photos = await service.getPhotosByUser(1, false);

    expect(photos.length).toBe(2);
  });

  it('should delete a photo', async () => {
    const photo = await service.getPhoto(1, false);
    await service.deletePhoto(photo);

    const deletedPhoto = await service.getPhoto(1, true);

    expect(deletedPhoto).toBeDefined();
    expect(deletedPhoto.id).toBe(1);
    expect(deletedPhoto.deletedAt).toBeInstanceOf(Date);
  })
});
