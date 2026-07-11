import { PersonRecord } from "@/person/entities/person.entity";
import { CreatePersonDto } from "./dto/create-person.dto";
import { UpdatePersonDto } from "@/person/dto/update-person-dto";

export interface IPersonProvider {
  findPeopleByName(
    userId: number,
    namePartial: string,
    includeDeleted: boolean,
  ): Promise<PersonRecord[]>;
  findPeopleByUserId(
    userId: number,
    includeDeleted: boolean,
  ): Promise<PersonRecord[]>;
  getPerson(
    id: number,
    includeDeleted: boolean,
  ): Promise<PersonRecord>;
  addPerson(
    userId: number,
    personDto: CreatePersonDto
  ): Promise<PersonRecord>;
  updatePerson(
    person: PersonRecord,
    personDto: UpdatePersonDto,
  ): Promise<PersonRecord>;
  deletePerson(
    person: PersonRecord
  ): Promise<void>;
}