import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { Providers } from '@/config';
import { UserProviderFake } from '@test/user.provider.fake';
import { SessionProviderFake } from '@test/session.provider.fake';
import { CryptProviderBcrypt } from '@/auth/crypt.provider.bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  const userProvider = new UserProviderFake();
  const sessionProvider = new SessionProviderFake();
  const cryptProvider = new CryptProviderBcrypt();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).overrideProvider(Providers.user)
      .useValue(userProvider)
      .overrideProvider(Providers.session)
      .useValue(sessionProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    userProvider.clear();
    userProvider.seed([
      {
        id: 1,
        username: 'TestUser',
        password: await cryptProvider.hash('TestPass', 10)
      },
      {
        id: 2,
        username: 'TestUser2',
        password: await cryptProvider.hash('TestPass2', 10)
      }
    ]);

    sessionProvider.clear();
  });

  it("Should log users in", async () => {
    // Logging in with an existing user
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser',
        password: 'TestPass'
      })
      .expect(201);

    expect(response.body.tokens.accessToken).toBeDefined();

    // Logging in with an incorrect password
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser',
        password: 'TestPass1',
      })
      .expect(401);

    // Logging in with a username that does not exist
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser3',
        password: 'TestPass',
      })
      .expect(401);
  });

  it('Should log users out', async () => {
    // Logout should fail when no user is logged in
    await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(401);

    // Logout should succeed when a user is logged in
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser',
        password: 'TestPass',
      })
      .expect(201);

    const loggedInSession = await sessionProvider.findSessionByUserId(1);
    expect(loggedInSession).toBeDefined();
    expect(loggedInSession.deletedAt).toBeUndefined();

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', 'Bearer ' + loginResponse.body.tokens.accessToken)
      .expect(201);

    const loggedOutSession = await sessionProvider.findSessionByUserId(1);
    expect(loggedOutSession).toBeDefined();
    expect(loggedOutSession.deletedAt).toBeInstanceOf(Date);
  });

  it("Should refresh a user's tokens", async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser',
        password: 'TestPass',
      })
      .expect(201);

    expect(loginResponse.body.tokens.accessToken).toBeDefined();
    expect(loginResponse.body.tokens.refreshToken).toBeDefined();

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', 'Bearer ' + loginResponse.body.tokens.refreshToken)
      .expect(201);

    expect(refreshResponse.body.tokens.accessToken).toBeDefined();
    expect(refreshResponse.body.tokens.refreshToken).toBeDefined();
    expect(refreshResponse.body.tokens.accessToken).not.toEqual(
      loginResponse.body.tokens.accessToken,
    );
    expect(refreshResponse.body.tokens.refreshToken).not.toEqual(
      loginResponse.body.tokens.refreshToken,
    );
  });
});
