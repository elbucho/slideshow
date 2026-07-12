import { Test, TestingModule } from '@nestjs/testing';
import { PersonService } from './person.service';
import { PersonProviderFake } from "@test/providers/person.provider.fake";
import { Providers } from "@/config";

describe('PersonService', () => {
  let service: PersonService;
  const personProvider = new PersonProviderFake();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonService,
        {
          provide: Providers.person,
          useValue: personProvider
        }
      ]
    }).compile();

    service = module.get<PersonService>(PersonService);
  });

  beforeEach(async () => {
    personProvider.clear();
    personProvider.seed([
      {
        id: 1,
        userId: 1,
        firstName: "John",
        lastName: "Doe",
        createdAt: new Date()
      },
    ]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it("should get a person by a given id", async () => {
    const person = await service.getPerson(1);

    expect(person).toBeDefined();
    expect(person.firstName).toEqual("John");
    expect(person.lastName).toEqual("Doe");
  });

  it('should create a person', async () => {
    const person = await service.createPerson(
      1,
      {
        firstName: 'Jane',
        lastName: 'Doe',
      }
    );

    expect(person).toBeDefined();
    expect(person.createdAt).toBeDefined();
    expect(person.createdAt).toBeInstanceOf(Date);
  });

  it('should update a person', async () => {
    const person = await service.getPerson(1);
    const updatedPerson = await service.updatePerson(
      person,
      {
        firstName: 'Jane'
      }
    );

    expect(person).toBeDefined();
    expect(updatedPerson).toBeDefined();
    expect(updatedPerson.firstName).toEqual("Jane");
    expect(updatedPerson.lastName).toEqual("Doe");
    expect(updatedPerson.updatedAt).toBeInstanceOf(Date);
  });

  it('should delete a person', async () => {
    const person = await service.getPerson(1);
    await service.deletePerson(person);

    const deletedPerson = await service.getPerson(1, true);
    expect(deletedPerson).toBeDefined();
    expect(deletedPerson.deletedAt).toBeInstanceOf(Date);
  });

  it('should get people associated with a user id', async () => {
    const people = await service.getPeople(1);

    expect(people).toBeDefined();
    expect(people).toHaveLength(1);
    expect(people[0].firstName).toEqual("John");
    expect(people[0].lastName).toEqual("Doe");
    expect(people[0].createdAt).toBeInstanceOf(Date);
  });

  it('should get people whose names match a given string', async () => {
    await service.createPerson(
      1,
      {
        firstName: 'Jane',
        lastName: 'Doe'
      }
    );

    const people = await service.findPeople(1, 'Do');

    expect(people).toBeDefined();
    expect(people).toHaveLength(2);
    expect(people[0].firstName).not.toEqual(people[1].firstName);
    expect(people[0].lastName).toEqual(people[1].lastName);
    expect(people[0].createdAt).toBeInstanceOf(Date);
    expect(people[1].createdAt).toBeInstanceOf(Date);
  });
});
