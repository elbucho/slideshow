import { IPersonProvider } from "./person.provider.interface";
import { CreatePersonDto } from "@/person/dto/create-person.dto";
import { Person, PersonRecord } from "@/person/entities/person.entity";
import { UpdatePersonDto } from "@/person/dto/update-person-dto";
import { InjectModel } from "@nestjs/sequelize";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Op, Sequelize } from "sequelize";

@Injectable()
export class PersonProviderSequelize implements IPersonProvider {
  constructor(
    @InjectModel(Person) private readonly personEntity: typeof Person,
  ) {}

  private async getPersonRecord(
    id: number,
    includeDeleted: boolean = false,
  ): Promise<Person> {
    const person = await this.personEntity.findByPk(id, {
      paranoid: !includeDeleted,
    });

    if (!person) {
      throw new NotFoundException("Person not found");
    }

    return person;
  }

  async getPerson(id: number, includeDeleted: boolean): Promise<PersonRecord> {
    const person = await this.getPersonRecord(id, includeDeleted);

    return person.toJSON();
  }

  async addPerson(userId: number, personDto: CreatePersonDto): Promise<PersonRecord> {
    const person = await this.personEntity.create({
      userId: userId,
      ...personDto
    }).catch(() => {
      throw new BadRequestException("Person already exists");
    });

    return person.toJSON();
  }

  async deletePerson(person: PersonRecord): Promise<void> {
    const personEntity = await this.getPersonRecord(person.id);

    return personEntity.destroy();
  }

  async findPeopleByName(
    userId: number,
    namePartial: string,
    includeDeleted: boolean,
  ): Promise<PersonRecord[]> {
    const lowerSearchTerm = namePartial.toLowerCase();
    let peopleRecords: PersonRecord[] = [];

    const people = await this.personEntity.findAll({
      where: {
        [Op.and]: [
          {
            userId: userId,
          },
          {
            [Op.or]: [
              Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("firstName")),
                Op.like,
                `%${lowerSearchTerm}%`,
              ),
              Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("lastName")),
                Op.like,
                `%${lowerSearchTerm}%`,
              ),
            ],
          },
        ],
      },
      paranoid: !includeDeleted,
    });

    people.forEach((person) => {
      peopleRecords.push(person.toJSON());
    });

    return peopleRecords;
  }

  async findPeopleByUserId(
    userId: number,
    includeDeleted: boolean,
  ): Promise<PersonRecord[]> {
    let peopleRecords: PersonRecord[] = [];

    const people = await this.personEntity.findAll({
      where: {
        userId: userId,
      },
      paranoid: !includeDeleted,
    });

    people.forEach((person) => {
      peopleRecords.push(person.toJSON());
    });

    return peopleRecords;
  }

  async updatePerson(
    person: PersonRecord,
    personDto: UpdatePersonDto,
  ): Promise<PersonRecord> {
    const personEntity = await this.getPersonRecord(person.id);

    await personEntity
      .update(personDto)
      .catch(() => {
        throw new BadRequestException(
          "Person already exists with the given first and last name",
        );
      })
      .then((person) => {
        person.save();
      });

    return personEntity.toJSON();
  }
}