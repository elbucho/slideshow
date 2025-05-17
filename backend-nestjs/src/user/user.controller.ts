import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiCreatedResponse, ApiBadRequestResponse, ApiFoundResponse, ApiNotFoundResponse, ApiOkResponse } from '@nestjs/swagger';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
	@ApiCreatedResponse({
		description: 'User created successfully'
	})
	@ApiBadRequestResponse({
		description: 'User already exists'
	})
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get(':id')
	@ApiFoundResponse({
		description: 'User found'
	})
	@ApiNotFoundResponse({
		description: 'No user matching criteria found'
	})
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

	@ApiOkResponse({
		description: 'User modified successfully'
	})
	@ApiNotFoundResponse({
		description: 'No user matching criteria found'
	})
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

	@ApiOkResponse({
		description: 'Returns true on deletion, and false if not found'
	})
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
