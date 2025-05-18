import {
  BadRequestException,
  Injectable,
	Inject,
  NotFoundException,
	forwardRef,
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { InjectModel } from "@nestjs/sequelize";
import { User } from "./entities/user.entity";
import { AuthService } from "src/auth/auth.service";

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    @Inject(forwardRef(() => AuthService)) 
			private readonly authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    return await this.userModel
      .create({
        ...createUserDto,
        password: this.authService.hash(createUserDto.password),
      })
      .catch((err) => {
        throw new BadRequestException("User already exists");
      });
  }

  async findById(id: number, includeDeleted: boolean = false): Promise<User> {
    const user = await this.userModel.findByPk(id, {
      paranoid: !includeDeleted,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    let updatedRequest = { ...updateUserDto };

    if (updateUserDto.password) {
      updatedRequest.password = this.authService.hash(updateUserDto.password);
    }

    const user = await this.findById(id);

    return user.update({ ...updatedRequest });
  }

  async remove(id: number): Promise<boolean> {
		const user = await this.findById(id);
		await user.destroy().catch(() => false);

		return true;
  }

	async getUserByUsername(username: string): Promise<User> {
		const user = await this.userModel.findOne({
			where: {
				username: username
			}
		});

		if (!user) {
			throw new NotFoundException('No users found');
		}

		return user;
	}
}
