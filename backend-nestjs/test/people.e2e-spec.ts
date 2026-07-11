import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { Providers } from '@/config';
import { UserProviderFake } from '@test/user.provider.fake';
import { SessionProviderFake } from '@test/session.provider.fake';
import { CryptProviderBcrypt } from '@/auth/crypt.provider.bcrypt';
import { PersonProviderFake } from '@test/person.provider.fake';
import { LoginRequestDto } from '@/auth/dto/login-request.dto';

describe('PersonController (e2e)', () => {
  let app: INestApplication<App>;

  const userProvider = new UserProviderFake();
  const sessionProvider = new SessionProviderFake();
  const personProvider = new PersonProviderFake();
  const cryptProvider = new CryptProviderBcrypt();

  async function login(
    loginRequest: LoginRequestDto = { username: 'TestUser', password: 'TestPass' },
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginRequest);

    return response.body.tokens.accessToken;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).overrideProvider(Providers.user)
      .useValue(userProvider)
      .overrideProvider(Providers.session)
      .useValue(sessionProvider)
      .overrideProvider(Providers.person)
      .useValue(personProvider)
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
    ]);

    sessionProvider.clear();

    personProvider.clear();
    personProvider.seed([
      {
        id: 1,
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
      }
    ])
  });

  it('should prevent access from non-logged-in users', async () => {
    // Creating
    await request(app.getHttpServer())
      .post('/people')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
      })
      .expect(401);

    // Finding all people
    await request(app.getHttpServer())
      .get('/people')
      .expect(401);

    // Finding people by search term
    await request(app.getHttpServer())
      .get('/people')
      .query({
        search: 'Doe'
      })
      .expect(401);

    // Finding a given person
    await request(app.getHttpServer())
      .get('/people/1')
      .expect(401);

    // Updating
    await request(app.getHttpServer())
      .patch('/people/1')
      .send({
        firstName: 'Jane',
      })
      .expect(401);

    // Deleting
    await request(app.getHttpServer())
      .delete('/people/1')
      .expect(401);
  });

  it('Should create a person', async () => {
    const accessToken = await login();

    const response = await request(app.getHttpServer())
      .post('/people')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
      })
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(201);

    expect(response.body.userId).toEqual(1);
    expect(response.body.firstName).toEqual('Jane');
    expect(response.body.lastName).toEqual('Doe');
    expect(response.body.createdAt).toBeDefined();

    const people = await personProvider.findPeopleByUserId(1, false);

    expect(people).toHaveLength(2);
  });

  it('Should find all people associated with the logged in user', async () => {
    const accessToken = await login();

    const response = await request(app.getHttpServer())
      .get('/people')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].firstName).toEqual('John');
    expect(response.body[0].lastName).toEqual('Doe');
  });

  it('Should find all people based on a search term', async () => {
    const accessToken = await login();

    // Adding a new user
    await request(app.getHttpServer())
      .post('/people')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
      })
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/people')
      .query({
        search: 'Doe',
      })
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].firstName).not.toEqual(response.body[1].firstName);
    expect(response.body[0].lastName).toEqual(response.body[1].lastName);
  });

  it('Should get a person by their id', async () => {
    // Should throw UnauthorizedException if the logged-in user is not the right one
    const newUserLogin: LoginRequestDto = {
      username: 'TestUser2',
      password: 'TestPass2',
    };

    await userProvider.createUser({
      ...newUserLogin,
      password: await cryptProvider.hash(
        newUserLogin.password, 10
      )
    });

    let accessToken = await login(newUserLogin);

    await request(app.getHttpServer())
      .get('/people/1')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(401);

    // Should return a person when the right user is logged in
    accessToken = await login();

    const response = await request(app.getHttpServer())
      .get('/people/1')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200);

    expect(response.body.firstName).toEqual('John');
    expect(response.body.lastName).toEqual('Doe');
    expect(response.body.createdAt).toBeDefined();
  });

  it('Should update a person', async () => {
    const accessToken = await login();

    const response = await request(app.getHttpServer())
      .patch('/people/1')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        firstName: 'Jane',
      })
      .expect(200);

    expect(response.body.firstName).toEqual('Jane');
    expect(response.body.lastName).toEqual('Doe');
  });

  it('Should delete a person', async () => {
    const accessToken = await login();

    await request(app.getHttpServer())
      .delete('/people/1')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200);

    await request(app.getHttpServer())
      .get('/people/1')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(404);

    const existingPerson = await personProvider.getPerson(1, true);

    expect(existingPerson).toBeDefined();
    expect(existingPerson.deletedAt).toBeDefined();
  })

/*  it('Should create users', async () => {
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
  });*/
});
