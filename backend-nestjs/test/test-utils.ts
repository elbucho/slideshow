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

export interface TestSuite {
  app: INestApplication<App>;
  providers: {
    user: UserProviderFake;
    session: SessionProviderFake;
    person: PersonProviderFake;
  }
}

export async function buildTestSuite(): Promise<TestSuite> {
  const testSuite: Omit<TestSuite, 'app'> = {
    providers: {
      user: new UserProviderFake(),
      session: new SessionProviderFake(),
      person: new PersonProviderFake(),
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