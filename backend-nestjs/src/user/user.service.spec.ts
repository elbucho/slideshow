import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "@/user/user.service";
import { UserProviderFake } from "@test/user.provider.fake"
import { AuthService } from "@/auth/auth.service";
import { Providers } from "@/config";
import { CreateUserDto } from "@/user/dto/create-user.dto";

describe("UserService", () => {
  let service: UserService;

  const mockAuthService = {
    hash: jest.fn(() => crypto.randomUUID())
  }

  const userProvider = new UserProviderFake();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: Providers.user,
          useValue: userProvider,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  beforeEach(() => {
    userProvider.clear();

    userProvider.seed([
      {
        id: 1,
        username: "TestUser",
        password: "TestPass",
      },
    ]);
  })

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should find by id", async () => {
    const user = await service.findById(1);

    expect(user).toBeDefined();
  });

  it("should find by username", async() => {
    const user = await service.findByUsername("TestUser");

    expect(user).toBeDefined();
  })

  it("should create a user", async () => {
    const newUserDto: CreateUserDto = {
      username: "TestUser1234",
      password: "TestPass1234",
    };

    const user = await service.create(newUserDto);

    expect(user).toBeDefined();
    expect(user.username).toEqual(newUserDto.username);
    expect(user.password).not.toEqual(newUserDto.password);
  });

  it("should update a user", async () => {
    const existing = await service.findById(1);

    // Update username
    const updated1 = await service.update(1, { username: "TestUser1234" });

    expect(updated1).toBeDefined();
    expect(updated1.username).toEqual("TestUser1234");
    expect(updated1.password).toEqual(existing.password);

    // Update password
    const updated2 = await service.update(1, { password: "TestPass1234" });
    expect(updated2).toBeDefined();
    expect(updated2.username).toEqual("TestUser");
    expect(updated2.password).not.toEqual(existing.password);
  });

  it("should delete a user", async () => {
    await service.remove(1);

    const user = await service.findById(1, true);
    expect(user).toBeDefined();
    expect(user.deletedAt).toBeInstanceOf(Date);
  });
});
