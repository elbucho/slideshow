import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "@/auth/auth.service";
import { ConfigModule } from "@nestjs/config";
import { CryptProviderFake } from "@test/crypt.provider.fake";
import { TokenProviderFake } from "@test/token.provider.fake";
import { UserService } from "@/user/user.service";
import { SessionService } from "@/session/session.service";
import { Providers } from "@/config";
import { TokenPayloadDto } from "@/auth/dto/token-payload.dto";
import { SessionRecord } from "@/session/entities/session.entity";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { UserRecord } from "@/user/entities/user.entity";
import { TokensDto } from "@/auth/dto/tokens.dto";

describe("AuthService", () => {
  let service: AuthService;

  const mockUserService = {
    findByUsername: jest.fn()
  };

  const mockSessionService = {
    getSessionByUserId: jest.fn(),
    getOrCreateSession: jest.fn(),
    deleteSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        await ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [`.env.testing`, ".env"],
        })
      ],
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: Providers.crypt,
          useClass: CryptProviderFake,
        },
        {
          provide: Providers.token,
          useClass: TokenProviderFake,
        }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
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
    const token: TokenPayloadDto = {
      userId: 1,
      data: JSON.stringify({
        foo: "bar"
      })
    }

    const signedToken = await service.signToken('Test1234', 10000, token);
    const tokenHash = await service.hash(signedToken);
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

    mockSessionService.getSessionByUserId.mockReturnValueOnce(session);
    const verifiedUser = await service.verifyToken(signedToken, 1);

    expect(verifiedUser).toEqual(user);

    let errors = 0;

    // No existing sessions found
    mockSessionService.getSessionByUserId.mockRejectedValue(
      new NotFoundException()
    );

    try {
      await service.verifyToken(signedToken, 1);
    } catch (err) {
      ++errors;
      expect(err).toBeInstanceOf(UnauthorizedException);
    }

    // User object not loaded with session
    const sessionNoUser: SessionRecord = {
      ...session,
      user: undefined
    }

    mockSessionService.getSessionByUserId.mockReturnValueOnce(sessionNoUser);

    try {
      await service.verifyToken(signedToken, 1);
    } catch (err) {
      ++errors;
      expect(err).toBeInstanceOf(UnauthorizedException);
    }

    // Token already expired
    const sessionExpired: SessionRecord = {
      ...session,
      tokenExpiresAt: new Date(Date.now() - 5 * 60 * 1000),
    }

    mockSessionService.getSessionByUserId.mockReturnValueOnce(sessionExpired);

    try {
      await service.verifyToken(signedToken, 1);
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

    // Username and password match
    mockUserService.findByUsername.mockReturnValueOnce(user);

    const authenticatedUser = await service.verifyUser('TestUser', password);
    expect(authenticatedUser).toEqual(user);

    let errors = 0;

    // Username not found
    mockUserService.findByUsername.mockRejectedValueOnce(
        new NotFoundException()
    );

    try {
      await service.verifyUser('TestUser2', password);
    } catch (err) {
      errors++;
      expect(err).toBeInstanceOf(UnauthorizedException);
    }

    // Password doesn't match
    mockUserService.findByUsername.mockReturnValueOnce(user);

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

    const tokens: TokensDto = await service.login(user, response);

    expect(typeof(tokens.accessToken)).toBe('string');
    expect(typeof(tokens.refreshToken)).toBe('string');
    expect(response.cookie).toHaveBeenCalledTimes(2);
    expect(mockSessionService.getOrCreateSession).toHaveBeenCalledWith(
        user.id,
        await service.hash(tokens.refreshToken),
        expect.any(Date)
    );
  });

  it("should log a user out", async () => {
    const response = {
      clearCookie: jest.fn(),
    } as any;

    const user: UserRecord = {
      id: 1,
      username: "TestUser",
      password: await service.hash("Test1234"),
      createdAt: new Date(),
    };

    const success = await service.logout(user, response);

    expect(success).toBeTruthy();
    expect(response.clearCookie).toHaveBeenCalledTimes(2);
    expect(mockSessionService.deleteSession).toHaveBeenCalledWith(user.id);
  })
});
