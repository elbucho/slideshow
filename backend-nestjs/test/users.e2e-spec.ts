import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { Providers } from '@/config';
import { UserProviderFake } from '@test/user.provider.fake';
import { SessionProviderFake } from '@test/session.provider.fake';
import { CryptProviderBcrypt } from '@/auth/crypt.provider.bcrypt';

describe('UserController (e2e)', () => {
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

  it('Should create users', async () => {
    // Creating a user that doesn't currently exist
    const response = await request(app.getHttpServer())
      .post('/user')
      .send({
        username: 'Test1234',
        password: 'TestPass',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        username: 'Test1234',
        id: expect.any(Number),
      }),
    );

    // Trying to create a user that already exists - should fail
    await request(app.getHttpServer())
      .post('/user')
      .send({
        username: 'TestUser',
        password: 'TestPass',
      })
      .expect(400);
  });

  it('Should get a user', async () => {
    // Not logged in; request should fail
    await request(app.getHttpServer())
      .get('/user/1')
      .expect(401);

    // After logging in; request should succeed
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser',
        password: 'TestPass',
      })
      .expect(201);

    expect(loginResponse.body.tokens.accessToken).toBeDefined();
    expect(typeof loginResponse.body.tokens.accessToken).toBe('string');

    await request(app.getHttpServer())
      .get('/user/1')
      .set('Authorization', 'Bearer ' + loginResponse.body.tokens.accessToken)
      .expect(200);

    // Getting a record for a non-logged-in user should fail
    await request(app.getHttpServer())
      .get('/user/2')
      .set('Authorization', 'Bearer ' + loginResponse.body.tokens.accessToken)
      .expect(401);
  });

  it("Should update a user", async () => {
    // Not logged in, should fail
    await request(app.getHttpServer())
      .patch('/user/1')
      .set({
        username: 'TestUser1',
        password: 'TestPass1',
      })
      .expect(401);

    //Logging in; request should succeed
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser',
        password: 'TestPass',
      })
      .expect(201);

    const updatedUser = await request(app.getHttpServer())
      .patch('/user/1')
      .send({
        username: 'TestUser1',
        password: 'TestPass1',
      })
      .set('Authorization', 'Bearer ' + loginResponse.body.tokens.accessToken)
      .expect(200);

    expect(updatedUser.body.username).toBe('TestUser1');
    expect(cryptProvider.hashMatches('TestPass1', updatedUser.body.password)).toBeTruthy();

    // Updating a user you are not logged in as should fail
    await request(app.getHttpServer())
      .patch('/user/2')
      .send({
        username: 'TestUser1',
        password: 'TestPass1',
      })
      .set('Authorization', 'Bearer ' + loginResponse.body.tokens.accessToken)
      .expect(401);

    // Updating a username to one that already exists should fail
    await request(app.getHttpServer())
      .patch('/user/1')
      .send({
        username: 'TestUser2'
      })
      .set('Authorization', 'Bearer ' + loginResponse.body.tokens.accessToken)
      .expect(400);
  });

  it("Should delete a user", async () => {
    // Non-logged-in requests should fail
    await request(app.getHttpServer())
      .delete('/user/1')
      .expect(401);

    // After logging in, deleting a different user should fail
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser',
        password: 'TestPass',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/user/2')
      .set('Authorization', 'Bearer ' + loginResponse.body.tokens.accessToken)
      .expect(401);

    // Deleting the logged-in user should succeed:
    await request(app.getHttpServer())
      .delete('/user/1')
      .set('Authorization', 'Bearer ' + loginResponse.body.tokens.accessToken)
      .expect(200);

    const user = await userProvider.findById(1, true);
    expect(user.deletedAt).toBeInstanceOf(Date);
  });
});
