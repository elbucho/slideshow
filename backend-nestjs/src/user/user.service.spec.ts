import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "@/user/user.service";
import { UserProviderFake } from "@test/user.provider.fake"
import { AuthService } from "@/auth/auth.service";
import { Providers } from "@/config";
import { CreateUserDto } from "@/user/dto/create-user.dto";
import { UpdateUserDto } from "@/user/dto/update-user.dto";

describe("UserService", () => {
  let service: UserService;

  const mockAuthService = {
    hash: jest.fn((hash: string) => crypto.randomUUID())
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
    const updateUserDto: UpdateUserDto = {
      username: "TestUser1234",
      password: "TestPass1234"
    };

    const updated = await service.update(1, updateUserDto);

    expect(updated).toBeDefined();
    expect(updated.username).toEqual(updateUserDto.username);
    expect(updated.password).not.toEqual(updateUserDto.password);
  });

  it("should delete a user", async () => {
    await service.remove(1);

    const user = await service.findById(1, true);
    expect(user).toBeDefined();
    expect(user.deletedAt).toBeInstanceOf(Date);
  });
});
