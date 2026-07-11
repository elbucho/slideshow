import { Injectable, Inject } from '@nestjs/common';
import { Providers } from '@/config'
import { IPersonProvider } from "@/person/person.provider.interface";
import { CreatePersonDto } from "@/person/dto/create-person.dto";
import { PersonRecord } from "@/person/entities/person.entity";
import { UpdatePersonDto } from "@/person/dto/update-person-dto";

@Injectable()
export class PersonService {
  constructor(
    @Inject(Providers.person)
    private readonly personProvider: IPersonProvider
  ) { }

  async getPerson(id: number, includeDeleted: boolean = false): Promise<PersonRecord> {
    return this.personProvider.getPerson(id, includeDeleted);
  }

  async createPerson(userId: number, personDto: CreatePersonDto): Promise<PersonRecord> {
    return this.personProvider.addPerson(userId, personDto);
  }

  async updatePerson(person: PersonRecord, personDto: UpdatePersonDto): Promise<PersonRecord> {
    return this.personProvider.updatePerson(person, personDto);
  }

  async deletePerson(person: PersonRecord): Promise<void> {
    return this.personProvider.deletePerson(person);
  }

  async getPeople(userId: number): Promise<PersonRecord[]> {
    return this.personProvider.findPeopleByUserId(userId, false);
  }

  async findPeople(userId: number, searchTerm: string): Promise<PersonRecord[]> {
    return this.personProvider.findPeopleByName(userId, searchTerm, false);
  }
}
