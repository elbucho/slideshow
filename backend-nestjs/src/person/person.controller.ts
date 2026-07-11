import {
  Body,
  Controller,
  Inject,
  Post,
  Get,
  Patch,
  Delete,
  UseGuards,
  Param,
  UnauthorizedException,
  Query,
} from "@nestjs/common";
import { PersonService } from './person.service';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { CreatePersonDto } from "@/person/dto/create-person.dto";
import { UpdatePersonDto } from "@/person/dto/update-person-dto";
import { CurrentUser } from "@/auth/current-user.decorator";
import { UserRecord } from "@/user/entities/user.entity";
import { PersonRecord } from "@/person/entities/person.entity";

@UseGuards(JwtAuthGuard)
@Controller("people")
export class PersonController {
  constructor(@Inject(PersonService) private personService: PersonService) {}

  @ApiCreatedResponse({
    description: "Person created successfully",
  })
  @ApiBadRequestResponse({
    description: "Person already exists",
  })
  @ApiUnauthorizedResponse()
  @Post()
  async create(
    @Body() personDto: CreatePersonDto,
    @CurrentUser() user: UserRecord,
  ): Promise<PersonRecord> {
    return this.personService.createPerson(user.id, personDto);
  }

  @ApiOkResponse({
    description: "People found",
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({
    description: "No person matching criteria found",
  })
  @Get()
  @ApiQuery({
    name: 'search',
    required: false,
    type: String
  })
  async findPeople(
    @CurrentUser() user: UserRecord,
    @Query('search') searchTerm?: string,
  ): Promise<PersonRecord[]> {
    if (!searchTerm) {
      return this.personService.getPeople(user.id);
    }

    return this.personService.findPeople(user.id, searchTerm);
  }

  @ApiOkResponse({
    description: "Person found",
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({
    description: "No person matching criteria found",
  })
  @Get(":id")
  async getPerson(
    @Param("id") id: string,
    @CurrentUser() user: UserRecord,
  ): Promise<PersonRecord> {
    const person = await this.personService.getPerson(+id);

    if (person.userId === user.id) {
      return person;
    }

    throw new UnauthorizedException();
  }

  @ApiOkResponse({
    description: "Person modified successfully",
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({
    description: "No person matching criteria found",
  })
  @ApiBadRequestResponse({
    description: "Person already exists with the given first and last name",
  })
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() personDto: UpdatePersonDto,
    @CurrentUser() user: UserRecord,
  ) {
    const person = await this.personService.getPerson(+id);

    if (person.userId === user.id) {
      return this.personService.updatePerson(person, personDto);
    }

    throw new UnauthorizedException();
  }

  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({
    description: "No person matching criteria found",
  })
  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: UserRecord,
  ): Promise<void> {
    const person = await this.personService.getPerson(+id);

    if (person.userId === user.id) {
      return this.personService.deletePerson(person);
    }

    throw new UnauthorizedException();
  }
}
