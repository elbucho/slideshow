import request from 'supertest';
import { LoginRequestDto } from '@/auth/dto/login-request.dto';
import {
  buildTestSuite,
  hashValue,
  login,
  TestSuite
} from '@test/test-utils';

describe('PersonController (e2e)', () => {
  let testSuite: TestSuite;

  beforeAll(async () => {
    testSuite = await buildTestSuite();
  });

  beforeEach(async () => {
    testSuite.providers.user.clear();
    testSuite.providers.user.seed([
      {
        id: 1,
        username: 'TestUser',
        password: await hashValue('TestPass'),
      },
    ]);

    testSuite.providers.session.clear();

    testSuite.providers.person.clear();
    testSuite.providers.person.seed([
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
    await request(testSuite.app.getHttpServer())
      .post('/people')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
      })
      .expect(401);

    // Finding all people
    await request(testSuite.app.getHttpServer())
      .get('/people')
      .expect(401);

    // Finding people by search term
    await request(testSuite.app.getHttpServer())
      .get('/people')
      .query({
        search: 'Doe',
      })
      .expect(401);

    // Finding a given person
    await request(testSuite.app.getHttpServer())
      .get('/people/1')
      .expect(401);

    // Updating
    await request(testSuite.app.getHttpServer())
      .patch('/people/1')
      .send({
        firstName: 'Jane',
      })
      .expect(401);

    // Deleting
    await request(testSuite.app.getHttpServer())
      .delete('/people/1')
      .expect(401);
  });

  it('Should create a person', async () => {
    const tokens = await login(testSuite.app);

    const response = await request(testSuite.app.getHttpServer())
      .post('/people')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
      })
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(201);

    expect(response.body.userId).toEqual(1);
    expect(response.body.firstName).toEqual('Jane');
    expect(response.body.lastName).toEqual('Doe');
    expect(response.body.createdAt).toBeDefined();

    const people = await testSuite.providers.person.findPeopleByUserId(1, false);

    expect(people).toHaveLength(2);
  });

  it('Should find all people associated with the logged in user', async () => {
    const tokens = await login(testSuite.app);

    const response = await request(testSuite.app.getHttpServer())
      .get('/people')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].firstName).toEqual('John');
    expect(response.body[0].lastName).toEqual('Doe');
  });

  it('Should find all people based on a search term', async () => {
    const tokens = await login(testSuite.app);

    // Adding a new user
    await request(testSuite.app.getHttpServer())
      .post('/people')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
      })
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(201);

    const response = await request(testSuite.app.getHttpServer())
      .get('/people')
      .query({
        search: 'Doe',
      })
      .set('Authorization', 'Bearer ' + tokens.accessToken)
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

    await testSuite.providers.user.createUser({
      ...newUserLogin,
      password: await hashValue(newUserLogin.password)
    });

    let tokens = await login(testSuite.app, newUserLogin);

    await request(testSuite.app.getHttpServer())
      .get('/people/1')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(401);

    // Should return a person when the right user is logged in
    tokens = await login(testSuite.app);

    const response = await request(testSuite.app.getHttpServer())
      .get('/people/1')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(200);

    expect(response.body.firstName).toEqual('John');
    expect(response.body.lastName).toEqual('Doe');
    expect(response.body.createdAt).toBeDefined();
  });

  it('Should update a person', async () => {
    const tokens = await login(testSuite.app);

    const response = await request(testSuite.app.getHttpServer())
      .patch('/people/1')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .send({
        firstName: 'Jane',
      })
      .expect(200);

    expect(response.body.firstName).toEqual('Jane');
    expect(response.body.lastName).toEqual('Doe');
  });

  it('Should delete a person', async () => {
    const tokens = await login(testSuite.app);

    await request(testSuite.app.getHttpServer())
      .delete('/people/1')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(200);

    await request(testSuite.app.getHttpServer())
      .get('/people/1')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(404);

    const existingPerson = await testSuite.providers.person.getPerson(1, true);

    expect(existingPerson).toBeDefined();
    expect(existingPerson.deletedAt).toBeDefined();
  });
});
