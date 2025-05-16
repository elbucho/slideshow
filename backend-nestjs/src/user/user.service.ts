import { 
	HttpException, HttpStatus, 
	Inject, Injectable 
} from '@nestjs/common';
import { Providers } from 'src/config';
import { User } from './user.entity';
import { CreateUserDto } from './user.schema';

@Injectable()
export class UserService {
	constructor(@Inject(Providers.user) private usersRepository: typeof User) {}

	async getUserByUsername(
		username: string, 
		includeDeleted: boolean = false
	): Promise<User> {
		const user = await this.usersRepository.findOne({
			where: { username: username	},
			paranoid: !includeDeleted
		});

		if (!user) {
			throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		}

		return user;
	}

	async getUserById(
		id: number, 
		includeDeleted: boolean = false
	): Promise<User> {
		const user = await this.usersRepository.findByPk<User>(id, {
			paranoid: !includeDeleted
		});

		if (!user) {
			throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		}

		return user;
	}

	async createUser(userRequest: CreateUserDto): Promise<User> {
		const [user, created] = await this.usersRepository.findOrCreate<User>({
			where: { username: userRequest.username },
			paranoid: false,
			defaults: {
				...userRequest
			}
		});

		if (!created || !user) {
			throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
		}

		return user;
	}

	async updateUser(id: number, updateRequest: Partial<CreateUserDto>): Promise<User> {
		const user = await this.getUserById(id);

		try {
			await user.update({...updateRequest});
			return user.save();
		} catch (Error) {
			throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
		}
	}

	async deleteUser(id: number): Promise<boolean> {
		try {
			const user = await this.getUserById(id);
			await user.destroy();
		} catch (HttpException) {
			return false;
		}

		return true;
	}
}
