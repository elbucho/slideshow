import { 
	Controller, Res, HttpStatus,
	Get, Post, Put, Delete, 
	Param, Body, Query,
	HttpException
} from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from './user.entity';
import { CreateUserDto } from './user.schema';
import { Response } from 'express';

@Controller('user')
export class UserController {
	constructor(private userService: UserService) {}

	@ApiResponse({ status: 200, description: 'User found' })
	@ApiResponse({ status: 404, description: 'User not found' })
	@Get(':id')
	async getUserById(@Param('id') id: number): Promise<User> {
		return this.userService.getUserById(id);
	}

	@ApiResponse({ status: 200, description: 'User found' })
	@ApiResponse({ status: 404, description: 'User not found' })
	@ApiQuery({ name: 'username' })
	@Get()
	async getUserByUsername(@Query('username') username: string): Promise<User> {
		console.log(username);

		return this.userService.getUserByUsername(username);
	}

	@ApiResponse({ status: 201, description: 'User created' })
	@ApiResponse({ status: 400, description: 'Invalid request' })
	@Post()
	async createUser(@Body() userRequest: CreateUserDto): Promise<User> {
		return this.userService.createUser(userRequest);
	}

	@ApiResponse({ status: 200, description: 'User modified' })
	@ApiResponse({ status: 400, description: 'Invalid request' })
	@ApiBody({ type: CreateUserDto })
	@Put(':id')
	async updateUser(
		@Param('id') id: number, 
		@Body() updateRequest: Partial<CreateUserDto>
	): Promise<User> {
		return this.userService.updateUser(id, updateRequest);
	}

	@ApiResponse({ status: 200, description: 'The record has been successfully deleted' })
	@ApiResponse({ status: 400, description: 'Invalid request' })
	@Delete(':id')
	async deleteUser(@Param('id') id: number, @Res() res: Response): Promise<void> {
		const deleted = await this.userService.deleteUser(id);

		if (deleted) {
			res.status(HttpStatus.OK).json({
				message: 'User deleted successfully'
			}).send();
		}

		throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
	}
}
