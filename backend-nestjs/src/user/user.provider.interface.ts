import { CreateUserDto } from "@/user/dto/create-user.dto";
import { UserRecord } from "@/user/entities/user.entity";
import { UpdateUserDto } from "@/user/dto/update-user.dto";

export interface IUserProvider {
  createUser(userDto: CreateUserDto): Promise<UserRecord>;
  updateUser(id: number, userDto: UpdateUserDto): Promise<UserRecord>;
  deleteUser(id: number): Promise<void>;
  findById(id: number, includeDeleted: boolean): Promise<UserRecord>;
  findByUsername(username: string, includeDeleted: boolean): Promise<UserRecord>;
}