import { Test, TestingModule } from "@nestjs/testing";
import { SessionService } from "@/session/session.service";
import { Providers } from "@/config";
import { SessionProviderFake } from "@test/providers/session.provider.fake";
import { NotFoundException } from "@nestjs/common";

describe("SessionService", () => {
  let service: SessionService;

  const sessionProvider = new SessionProviderFake();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: Providers.session,
          useValue: sessionProvider,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  beforeEach(() => {
    sessionProvider.clear();

    sessionProvider.seed([
      {
        id: 1,
        userId: 1,
        tokenHash: 'foo',
        tokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
      },
    ]);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return a session associated with a user id", async () => {
    const session = await service.getSessionByUserId(1);

    expect(session).toBeDefined();
    expect(session.userId).toBe(1);

    let errors = 0;

    try {
      await service.getSessionByUserId(2);
    } catch (err) {
      ++errors;
      expect(err).toBeInstanceOf(NotFoundException);
    }

    expect(errors).toBe(1);
  });

  it("should create a new session or return an existing one", async () => {
    const existingSession = await service.getOrCreateSession(
      1,
      'bar',
      new Date(Date.now() + 10 * 60 * 1000)
    );

    const newSession = await service.getOrCreateSession(
      2,
      'foo',
      new Date(Date.now() + 10 * 60 * 1000)
    );

    expect(existingSession).toBeDefined();
    expect(existingSession.userId).toBe(1);
    expect(existingSession.id).toBe(1);

    expect(newSession).toBeDefined();
    expect(newSession.userId).toBe(2);
    expect(newSession.id).toBeGreaterThan(1);
  });

  it("should delete a session", async () => {
    await service.deleteSession(1);
    const existingSession = await service.getSessionByUserId(1);

    expect(existingSession.deletedAt).toBeDefined();
    expect(existingSession.deletedAt).toBeInstanceOf(Date);
  })
});
