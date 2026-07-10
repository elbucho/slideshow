import { IUserProvider } from "@/user/user.provider.interface";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User, UserRecord } from "./entities/user.entity";
import { InjectModel } from "@nestjs/sequelize";

@Injectable()
export class UserProviderSequelize implements IUserProvider {
  constructor(@InjectModel(User) private readonly userEntity: typeof User) {}

  private async getUserRecord(id: number, includeDeleted: boolean = false): Promise<User> {
    const user = await this.userEntity.findByPk(id, {
      paranoid: !includeDeleted,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async createUser(userDto: CreateUserDto): Promise<UserRecord> {
    const user = await this.userEntity.create(userDto).catch(() => {
      throw new BadRequestException("User already exists");
    });

    return user.toJSON();
  }

  async updateUser(id: number, userDto: UpdateUserDto): Promise<UserRecord> {
    const user = await this.getUserRecord(id);

    await user.update(userDto).then((user) => { user.save(); }).catch(() => {
      throw new BadRequestException("Username already exists");
    });

    return user.toJSON();
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.getUserRecord(id);

    return user.destroy();
  }

  async findById(id: number, includeDeleted: boolean): Promise<UserRecord> {
    const user = await this.getUserRecord(id, includeDeleted);

    return user.toJSON();
  }

  async findByUsername(username: string, includeDeleted: boolean): Promise<UserRecord> {
    const user = await this.userEntity.findOne(
      {
        where: {
          username: username,
        },
        paranoid: !includeDeleted
      }
    );

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user.toJSON();
  }
}