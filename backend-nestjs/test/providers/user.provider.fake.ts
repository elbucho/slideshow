import { IUserProvider } from '@/user/user.provider.interface';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UpdateUserDto } from '@/user/dto/update-user.dto';
import { UserRecord } from '@/user/entities/user.entity';
import { AbstractProviderFake } from '@test/providers/abstract.provider.fake';

@Injectable()
export class UserProviderFake
  extends AbstractProviderFake<UserRecord>
  implements IUserProvider
{
  async findById(id: number, includeDeleted: boolean): Promise<UserRecord> {
    return this.findRecord(id, includeDeleted);
  }

  async findByUsername(
    username: string,
    includeDeleted: boolean,
  ): Promise<UserRecord> {
    const existing = this.records.find(
      (user) => {
        if (user.username === username) {
          if (!user.deletedAt || includeDeleted) {
            return true;
          }
        }

        return false;
      });

    if (existing) {
      return existing;
    }

    throw new NotFoundException('User not found');
  }

  async createUser(userDto: CreateUserDto): Promise<UserRecord> {
    let existingUser: UserRecord|null = null;

    try {
      existingUser = await this.findByUsername(userDto.username, true);
    } catch (err) {}

    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    return this.createRecord(userDto);
  }

  async deleteUser(id: number): Promise<void> {
    return this.deleteRecord(await this.findRecord(id));
  }

  async updateUser(id: number, userDto: UpdateUserDto): Promise<UserRecord> {
    let existing = await this.findById(id, false);

    if (userDto.username) {
      let existingUser: UserRecord | null = null;

      try {
        existingUser = await this.findByUsername(userDto.username, true);
      } catch (err) {}

      if (existingUser) {
        throw new BadRequestException('Username already exists');
      }
    }

    return this.updateRecord(existing, userDto);
  }
}