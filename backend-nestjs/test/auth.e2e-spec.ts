import request from 'supertest';
import {
  TestSuite,
  buildTestSuite,
  hashValue,
  login
} from '@test/test-utils';

describe('AuthController (e2e)', () => {
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
        password: await hashValue('TestPass')
      },
      {
        id: 2,
        username: 'TestUser2',
        password: await hashValue('TestPass2')
      }
    ]);

    testSuite.providers.session.clear();
  });

  it("Should log users in", async () => {
    // Logging in with an existing user
    const response = await request(testSuite.app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser',
        password: 'TestPass'
      })
      .expect(201);

    expect(response.body.tokens.accessToken).toBeDefined();

    // Logging in with an incorrect password
    await request(testSuite.app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser',
        password: 'TestPass1',
      })
      .expect(401);

    // Logging in with a username that does not exist
    await request(testSuite.app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'TestUser3',
        password: 'TestPass',
      })
      .expect(401);
  });

  it('Should log users out', async () => {
    // Logout should fail when no user is logged in
    await request(testSuite.app.getHttpServer())
      .post('/auth/logout')
      .expect(401);

    // Logout should succeed when a user is logged in
    const tokens = await login(testSuite.app);

    const loggedInSession = await testSuite.providers.session.findSessionByUserId(1);
    expect(loggedInSession).toBeDefined();
    expect(loggedInSession.deletedAt).toBeUndefined();

    await request(testSuite.app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', 'Bearer ' + tokens.accessToken)
      .expect(201);

    const loggedOutSession = await testSuite.providers.session.findSessionByUserId(1);
    expect(loggedOutSession).toBeDefined();
    expect(loggedOutSession.deletedAt).toBeInstanceOf(Date);
  });

  it("Should refresh a user's tokens", async () => {
    const tokens = await login(testSuite.app);

    const refreshResponse = await request(testSuite.app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', 'Bearer ' + tokens.refreshToken)
      .expect(201);

    expect(refreshResponse.body.tokens.accessToken).toBeDefined();
    expect(refreshResponse.body.tokens.refreshToken).toBeDefined();
    expect(refreshResponse.body.tokens.accessToken).not.toEqual(
      tokens.accessToken,
    );
    expect(refreshResponse.body.tokens.refreshToken).not.toEqual(
      tokens.refreshToken,
    );
  });
});
