import { IUserProvider } from '@/user/user.provider.interface';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UpdateUserDto } from '@/user/dto/update-user.dto';
import { UserRecord } from '@/user/entities/user.entity';

@Injectable()
export class UserProviderFake implements IUserProvider {
  private users: UserRecord[] = [];

  private async getNewId(): Promise<number> {
    let newId: number = 0;

    do {
      newId = Math.floor(Math.random() * 100);

      try {
        await this.findById(newId, true);
      } catch (NotFoundException) {
        return newId;
      }
    } while (1);

    return newId;
  }

  clear(): void {
    this.users = [];
  }

  seed(data: UserRecord[]): void {
    this.users = data;
  }

  async findById(id: number, includeDeleted: boolean): Promise<UserRecord> {
    const existing = this.users.find(user => user.id === id);

    if (existing) {
      if (existing.deletedAt) {
        if (includeDeleted) {
          return existing;
        }
      } else {
        return existing;
      }
    }

    throw new NotFoundException('User not found');  }

  async findByUsername(username: string, includeDeleted: boolean): Promise<UserRecord> {
    const existing = this.users.find(user => user.username === username);

    if (existing) {
      if (existing.deletedAt) {
        if (includeDeleted) {
          return existing;
        }
      } else {
        return existing;
      }
    }

    throw new NotFoundException('User not found');
  }

  async createUser(userDto: CreateUserDto): Promise<UserRecord> {
    const id = await this.getNewId();
    let userExists: boolean = false;

    try {
      const user = await this.findByUsername(userDto.username, true);

      if (user) { userExists = true; }
    } catch (NotFoundException) {}

    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    const newUser = { ...userDto, id: id };

    this.users.push(newUser);
    return newUser;
  }

  async deleteUser(id: number): Promise<void> {
    let existing = await this.findById(id, false);
    existing.deletedAt = new Date();

    return;
  }

  async updateUser(id: number, userDto: UpdateUserDto): Promise<UserRecord> {
    let existing = await this.findById(id, false);

    if (userDto.username) {
      let existingUser: UserRecord|null = null;
      try {
        existingUser = await this.findByUsername(userDto.username, true);
      } catch (err) {}

      if (existingUser) {
        throw new BadRequestException("Username already exists");
      }
    }

    existing = { ...existing, ...userDto };

    return existing;
  }
}