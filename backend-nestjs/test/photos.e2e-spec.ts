import request from 'supertest';
import { buildTestSuite, createPhoto, hashValue, login, TestSuite } from '@test/test-utils';

describe('PhotoController (e2e)', () => {
  let testSuite: TestSuite;
  let png: Buffer;

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

    png = createPhoto(
      { width: 100, height: 100 },
      { red: 255, green: 0, blue: 0, alpha: 255 }
    );

    testSuite.providers.photo.clear();
    testSuite.providers.photo.seed([
      {
        id: 1,
        userId: 1,
        data: png,
        createdAt: new Date(),
      },
    ]);
  });

  it('should prevent access from non-logged-in users', async () => {
    // Creating
    await request(testSuite.app.getHttpServer())
      .post('/photos')
      .send({
        data: png,
      })
      .expect(401);

    // Finding all photos
    await request(testSuite.app.getHttpServer()).get('/photos').expect(401);

    // Finding a given photo
    await request(testSuite.app.getHttpServer()).get('/photos/1').expect(401);

    // Deleting
    await request(testSuite.app.getHttpServer())
      .delete('/photos/1')
      .expect(401);
  });

  it('should create photos', async () => {
    const png = createPhoto(
      { width: 100, height: 100 },
      { red: 0, green: 255, blue: 0, alpha: 255 }
    );

    const tokens = await login(testSuite.app);

    const response = await request(testSuite.app.getHttpServer())
      .post('/photos')
      .send({
        data: png,
      })
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.createdAt).toBeDefined();
  });

  it('should get photos', async () => {
    const png = createPhoto(
      { width: 100, height: 100 },
      { red: 0, green: 255, blue: 0, alpha: 255 },
    );

    const tokens = await login(testSuite.app);

    await request(testSuite.app.getHttpServer())
      .post('/photos')
      .send({
        data: png,
      })
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(201);

    const response = await request(testSuite.app.getHttpServer())
      .get('/photos')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    expect(response.body.length).toEqual(2);
    expect(response.body[0].id).toBeDefined();
    expect(response.body[1].id).toBeDefined();
  });

  it('should get a photo by id', async () => {
    // When logged in as the owner, it should succeed
    let tokens = await login(testSuite.app);

    await request(testSuite.app.getHttpServer())
      .get('/photos/1')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200)
      .expect('Content-Type', 'image/png');

    // When logging in as a non-owner, it should not provide the photo
    await request(testSuite.app.getHttpServer())
      .post('/user')
      .send({
        username: 'TestUser2',
        password: 'TestPass2'
      })
      .expect(201);

    tokens = await login(
      testSuite.app,
      { username: 'TestUser2', password: 'TestPass2' }
    );

    await request(testSuite.app.getHttpServer())
      .get('/photos/1')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(401);
  });

  it('should delete a photo', async () => {
    // When logging in as a non-owner, it should fail
    await request(testSuite.app.getHttpServer())
      .post('/user')
      .send({
        username: 'TestUser2',
        password: 'TestPass2'
      })
      .expect(201);

    let tokens = await login(
      testSuite.app,
      { username: 'TestUser2', password: 'TestPass2' }
    );

    await request(testSuite.app.getHttpServer())
      .delete('/photos/1')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(401);

    // When logging in as the owner, it should succeed
    tokens = await login(testSuite.app);

    await request(testSuite.app.getHttpServer())
      .delete('/photos/1')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    const photo = await testSuite.providers.photo.getPhoto(1, true);

    expect(photo).toBeDefined();
    expect(photo.deletedAt).toBeInstanceOf(Date);
  });
})