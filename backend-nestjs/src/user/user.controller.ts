import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UnauthorizedException,
  Res,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { AuthService } from "src/auth/auth.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import {
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "./entities/user.entity";
import { Response } from "express";

@Controller("user")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    description: "User created successfully",
  })
  @ApiBadRequestResponse({
    description: "User already exists",
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get(":id")
  @ApiOkResponse({
    description: "User found",
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({
    description: "No user matching criteria found",
  })
  @UseGuards(JwtAuthGuard)
  async findById(@Param("id") id: string, @CurrentUser() user: User) {
    if (+id === user.id) {
      return this.userService.findById(+id);
    }

    throw new UnauthorizedException();
  }

  @ApiOkResponse({
    description: "User modified successfully",
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({
    description: "No user matching criteria found",
  })
  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    if (+id === user.id) {
      return this.userService.update(+id, updateUserDto);
    }

    throw new UnauthorizedException();
  }

  @ApiOkResponse({
    description: "Returns true on deletion, and false if not found",
  })
  @ApiUnauthorizedResponse()
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (+id === user.id) {
      const success = await this.userService.remove(+id);

      console.log(success);

      if (success) {
        return this.authService.logout(user, response);
      }

      return false;
    }

    throw new UnauthorizedException();
  }
}
