import { IPersonProvider } from '@/person/person.provider.interface';
import { CreatePersonDto } from '@/person/dto/create-person.dto';
import { PersonRecord } from '@/person/entities/person.entity';
import { UpdatePersonDto } from '@/person/dto/update-person-dto';
import { Injectable } from '@nestjs/common';
import { AbstractProviderFake } from '@test/providers/abstract.provider.fake';

@Injectable()
export class PersonProviderFake
  extends AbstractProviderFake<PersonRecord>
  implements IPersonProvider
{
  async addPerson(userId: number, personDto: CreatePersonDto): Promise<PersonRecord> {
    return this.createRecord({
      userId: userId,
      ...personDto
    });
  }

  async deletePerson(person: PersonRecord): Promise<void> {
    return this.deleteRecord(person);
  }

  async findPeopleByName(
    userId: number,
    namePartial: string,
    includeDeleted: boolean,
  ): Promise<PersonRecord[]> {
    let people: PersonRecord[] = [];

    this.records.find((person):void => {
      if (person.userId === userId) {
        if (!person.deletedAt || includeDeleted) {
          if (
            person.firstName.includes(namePartial) ||
            person.lastName.includes(namePartial)
          ) {
            people.push(person);
          }
        }
      }
    });

    return people;
  }

  async findPeopleByUserId(
    userId: number,
    includeDeleted: boolean,
  ): Promise<PersonRecord[]> {
    let people: PersonRecord[] = [];

    this.records.find((person): void => {
      if (person.userId === userId) {
        if (!person.deletedAt || includeDeleted) {
          people.push(person);
        }
      }
    });

    return people;
  }

  async getPerson(id: number, includeDeleted: boolean = false): Promise<PersonRecord> {
    return this.findRecord(id, includeDeleted);
  }

  async updatePerson(
    person: PersonRecord,
    personDto: UpdatePersonDto,
  ): Promise<PersonRecord> {
    return this.updateRecord(person, personDto);
  }
}