import request from 'supertest';
import {
  buildTestSuite,
  TestSuite,
  hashValue,
  login,
  testHash,
} from '@test/test-utils';

describe('UserController (e2e)', () => {
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
      {
        id: 2,
        username: 'TestUser2',
        password: await hashValue('TestPass2'),
      },
    ]);

    testSuite.providers.session.clear();
  });

  it('Should create users', async () => {
    // Creating a user that doesn't currently exist
    const response = await request(testSuite.app.getHttpServer())
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
    await request(testSuite.app.getHttpServer())
      .post('/user')
      .send({
        username: 'TestUser',
        password: 'TestPass',
      })
      .expect(400);
  });

  it('Should get a user', async () => {
    // Not logged in; request should fail
    await request(testSuite.app.getHttpServer())
      .get('/user/1')
      .expect(401);

    // After logging in; request should succeed
    const tokens = await login(testSuite.app);

    expect(tokens.accessToken).toBeDefined();
    expect(typeof tokens.accessToken).toBe('string');

    await request(testSuite.app.getHttpServer())
      .get('/user/1')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(200);

    // Getting a record for a non-logged-in user should fail
    await request(testSuite.app.getHttpServer())
      .get('/user/2')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(401);
  });

  it("Should update a user", async () => {
    // Not logged in, should fail
    await request(testSuite.app.getHttpServer())
      .patch('/user/1')
      .set({
        username: 'TestUser1',
        password: 'TestPass1',
      })
      .expect(401);

    //Logging in; request should succeed
    const tokens = await login(testSuite.app);

    const updatedUser = await request(testSuite.app.getHttpServer())
      .patch('/user/1')
      .send({
        username: 'TestUser1',
        password: 'TestPass1',
      })
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(200);

    expect(updatedUser.body.username).toBe('TestUser1');
    expect(testHash('TestPass1', updatedUser.body.password)).toBeTruthy();

    // Updating a user you are not logged in as should fail
    await request(testSuite.app.getHttpServer())
      .patch('/user/2')
      .send({
        username: 'TestUser1',
        password: 'TestPass1',
      })
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(401);

    // Updating a username to one that already exists should fail
    await request(testSuite.app.getHttpServer())
      .patch('/user/1')
      .send({
        username: 'TestUser2',
      })
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(400);
  });

  it("Should delete a user", async () => {
    // Non-logged-in requests should fail
    await request(testSuite.app.getHttpServer())
      .delete('/user/1')
      .expect(401);

    // After logging in, deleting a different user should fail
    const tokens = await login(testSuite.app);

    await request(testSuite.app.getHttpServer())
      .delete('/user/2')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(401);

    // Deleting the logged-in user should succeed:
    await request(testSuite.app.getHttpServer())
      .delete('/user/1')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(200);

    const user = await testSuite.providers.user.findById(1, true);
    expect(user.deletedAt).toBeInstanceOf(Date);
  });
});
