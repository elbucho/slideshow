import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "@/auth/auth.service";
import { Providers } from "@/config";
import { TokenPayloadDto } from "@/auth/dto/token-payload.dto";
import { SessionRecord } from "@/session/entities/session.entity";
import { UnauthorizedException } from "@nestjs/common";
import { UserRecord } from "@/user/entities/user.entity";
import { AuthModule } from "@/auth/auth.module";
import { UserProviderFake } from "@test/providers/user.provider.fake";
import { SessionProviderFake } from "@test/providers/session.provider.fake";
import { ConfigModule } from "@nestjs/config";
import { LoginResponseDto } from "@/auth/dto/login-response.dto";

describe("AuthService", () => {
  let service: AuthService;
  const env = process.env.NODE_ENV ?? "development.local";
  const userProvider = new UserProviderFake();
  const sessionProvider = new SessionProviderFake();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        await ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [`.env.${env}`, ".env"],
        }),
      ],
    })
      .overrideProvider(Providers.user)
      .useValue(userProvider)
      .overrideProvider(Providers.session)
      .useValue(sessionProvider)
      .compile();

    service = module.get<AuthService>(AuthService);
  });

  beforeEach(async () => {
    userProvider.clear();
    sessionProvider.clear();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should be able to hash and check hashes", async () => {
    const value = 'Test1234';
    const hash = await service.hash(value);
    const matches = await service.verifyHash(value, hash);

    expect(hash).not.toEqual(value);
    expect(matches).toBeTruthy();
  });

  it("should be able to sign and verify tokens", async () => {
    const payload: TokenPayloadDto = {
      userId: 1,
      data: JSON.stringify({
        foo: "bar"
      })
    };

    const response = {
      cookie: jest.fn()
    } as any

    const accessToken = await service.createAccessToken(payload, response);
    const tokenHash = await service.hash(accessToken);

    expect(service.verifyHash(accessToken, tokenHash)).toBeTruthy();

    const user: UserRecord = {
      id: 1,
      username: 'TestUser',
      password: '1234',
      createdAt: new Date(),
    };

    const session: SessionRecord = {
      id: 1,
      userId: 1,
      tokenHash: tokenHash,
      tokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      createdAt: new Date(),
      user: user
    }

    userProvider.seed([user]);
    sessionProvider.seed([session]);

    const verifiedUser = await service.verifyToken(accessToken, 1);
    expect(verifiedUser).toEqual(user);

    let errors = 0;

    // No existing sessions found
    sessionProvider.clear();

    try {
      await service.verifyToken(accessToken, 1);
    } catch (err) {
      ++errors;
      expect(err).toBeInstanceOf(UnauthorizedException);
    }

    // User object not loaded with session
    sessionProvider.seed([
      {
        ...session,
        userId: 0,
        user: undefined,
      },
    ]);

    try {
      await service.verifyToken(accessToken, 1);
    } catch (err) {
      ++errors;
      expect(err).toBeInstanceOf(UnauthorizedException);
    }

    // Token already expired
    sessionProvider.clear();
    sessionProvider.seed([
      {
        ...session,
        tokenExpiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    ]);

    try {
      await service.verifyToken(accessToken, 1);
    } catch (err) {
      ++errors;
      expect(err).toBeInstanceOf(UnauthorizedException);
    }

    expect(errors).toBe(3);
  });

  it("should be able to create a cookie for the access and refresh tokens", async () => {
    const response = {
      cookie: jest.fn(),
    } as any;

    const token: TokenPayloadDto = {
      userId: 1,
      data: JSON.stringify({
        foo: "bar",
      }),
    };

    const accessToken = await service.createAccessToken(token, response);
    const refreshToken = await service.createRefreshToken(token, response);

    expect(response.cookie).toHaveBeenCalledTimes(2);
    expect(response.cookie).toHaveBeenCalledWith(
        'AccessToken',
        accessToken,
        expect.any(Object)
    );
    expect(response.cookie).toHaveBeenCalledWith(
      "RefreshToken",
      refreshToken,
      expect.any(Object)
    );
  });

  it("should verify a username and password", async () => {
    const password = 'Test1234';
    const passwordHash = await service.hash(password);
    const user: UserRecord = {
      id: 1,
      username: 'TestUser',
      password: passwordHash,
      createdAt: new Date(),
    };

    userProvider.seed([user]);

    // Username and password match
    const authenticatedUser = await service.verifyUser('TestUser', password);
    expect(authenticatedUser).toEqual(user);

    let errors = 0;

    // Username not found
    try {
      await service.verifyUser('TestUser2', password);
    } catch (err) {
      errors++;
      expect(err).toBeInstanceOf(UnauthorizedException);
    }

    // Password doesn't match
    try {
      await service.verifyUser('TestUser', password + '1');
    } catch (err) {
      errors++;
      expect(err).toBeInstanceOf(UnauthorizedException);
    }

    expect(errors).toBe(2);
  });

  it("should login a user", async () => {
    const response = {
      cookie: jest.fn(),
    } as any;

    const user: UserRecord = {
      id: 1,
      username: "TestUser",
      password: await service.hash("Test1234"),
      createdAt: new Date(),
    };

    userProvider.seed([user]);

    const loginResponse: LoginResponseDto = await service.login(user, response);

    expect(typeof(loginResponse.tokens.accessToken)).toBe('string');
    expect(typeof(loginResponse.tokens.refreshToken)).toBe('string');
    expect(response.cookie).toHaveBeenCalledTimes(2);

    // Verify that session was created
    const session = await sessionProvider.findSessionByUserId(user.id);
    expect(session).toBeDefined();
    expect(service.verifyHash(loginResponse.tokens.refreshToken, session.tokenHash)).toBeTruthy();
    expect(session.tokenExpiresAt).toBeInstanceOf(Date);
  });

  it("should log a user out", async () => {
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as any;

    const payload: TokenPayloadDto = {
      userId: 1,
      data: JSON.stringify({
        foo: "bar",
      }),
    };

    const token = await service.createRefreshToken(payload, response);

    const userRecord: UserRecord = {
      id: 1,
      username: "TestUser",
      password: await service.hash("Test1234"),
      createdAt: new Date(),
    };

    const sessionRecord: SessionRecord = {
      id: 1,
      userId: 1,
      tokenHash: await service.hash(token),
      tokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      createdAt: new Date(),
      user: userRecord,
    };

    userProvider.seed([userRecord]);
    sessionProvider.seed([sessionRecord]);

    const success = await service.logout(userRecord, response);

    expect(success).toBeTruthy();
    expect(response.clearCookie).toHaveBeenCalledTimes(2);

    // Verify that session has been deleted
    const session = await sessionProvider.findSessionByUserId(userRecord.id);

    expect(session).toBeDefined();
    expect(session.deletedAt).toBeInstanceOf(Date);
  })
});
