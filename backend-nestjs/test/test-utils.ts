import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { UserProviderFake } from '@test/providers/user.provider.fake';
import { SessionProviderFake } from '@test/providers/session.provider.fake';
import { PersonProviderFake } from '@test/providers/person.provider.fake';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { Providers } from '@/config';
import { LoginRequestDto } from '@/auth/dto/login-request.dto';
import request from 'supertest';
import { CryptProviderBcrypt } from '@/auth/crypt.provider.bcrypt';
import { TokensDto } from '@/auth/dto/tokens.dto';
import { PNG } from 'pngjs';
import { PhotoProviderFake } from '@test/providers/photo.provider.fake';

interface Dimensions {
  width: number;
  height: number;
}

interface Color {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export interface TestSuite {
  app: INestApplication<App>;
  providers: {
    user: UserProviderFake;
    session: SessionProviderFake;
    person: PersonProviderFake;
    photo: PhotoProviderFake;
  };
}

export function createPhoto(dimensions: Dimensions, color: Color): Buffer {
  const png = new PNG(dimensions);

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;

      png.data[idx] = color.red;
      png.data[idx + 1] = color.green;
      png.data[idx + 2] = color.blue;
      png.data[idx + 3] = color.alpha;
    }
  }

  return PNG.sync.write(png);
}

export async function buildTestSuite(): Promise<TestSuite> {
  const testSuite: Omit<TestSuite, 'app'> = {
    providers: {
      user: new UserProviderFake(),
      session: new SessionProviderFake(),
      person: new PersonProviderFake(),
      photo: new PhotoProviderFake(),
    }
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(Providers.user)
    .useValue(testSuite.providers.user)
    .overrideProvider(Providers.session)
    .useValue(testSuite.providers.session)
    .overrideProvider(Providers.person)
    .useValue(testSuite.providers.person)
    .overrideProvider(Providers.photo)
    .useValue(testSuite.providers.photo)
    .compile();

  const app = moduleFixture.createNestApplication();

  return {
    ...testSuite,
    app: await app.init()
  }
}

export async function login(
  app: INestApplication,
  loginRequest: LoginRequestDto = { username: 'TestUser', password: 'TestPass' },
): Promise<TokensDto> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send(loginRequest);

  return response.body.tokens;
}

export async function hashValue(value: string): Promise<string> {
  const cryptProvider = new CryptProviderBcrypt();

  return cryptProvider.hash(value, 10);
}

export async function testHash(value: string, hash: string): Promise<boolean> {
  const cryptProvider = new CryptProviderBcrypt();

  return cryptProvider.hashMatches(value, hash);
}