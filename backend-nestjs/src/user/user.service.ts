import {
  Injectable,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { CreateUserDto } from "@/user/dto/create-user.dto";
import { UpdateUserDto } from "@/user/dto/update-user.dto";
import { UserRecord } from "@/user/entities/user.entity";
import { AuthService } from "@/auth/auth.service";
import { Providers } from "@/config";
import { IUserProvider } from "@/user/user.provider.interface";

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,

    @Inject(Providers.user)
    private readonly userProvider: IUserProvider,
  ) {}

  async findById(id: number, includeDeleted: boolean = false): Promise<UserRecord> {
    return this.userProvider.findById(id, includeDeleted);
  }

  async findByUsername(
    username: string,
    includeDeleted: boolean = false,
  ): Promise<UserRecord> {
    return this.userProvider.findByUsername(username, includeDeleted);
  }

  async create(createUserDto: CreateUserDto): Promise<UserRecord> {
    const hashedPassword = await this.authService.hash(createUserDto.password);

    return this.userProvider.createUser({
      ...createUserDto,
      password: hashedPassword
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserRecord> {
    if (updateUserDto.password) {
      return this.userProvider.updateUser(id, {
        ...updateUserDto,
        password: await this.authService.hash(updateUserDto.password),
      })
    }

    return this.userProvider.updateUser(id, updateUserDto);
  }

  async remove(id: number): Promise<void> {
    return this.userProvider.deleteUser(id);
  }
}
