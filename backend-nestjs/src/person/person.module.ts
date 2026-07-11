import { Module } from '@nestjs/common';
import { PersonController } from './person.controller';
import { PersonService } from './person.service';
import { SequelizeModule } from "@nestjs/sequelize";
import { Person } from "@/person/entities/person.entity";
import { Providers } from "@/config";
import { PersonProviderSequelize } from "@/person/person.provider.sequelize";

@Module({
  imports: [
    ...(process.env.NODE_ENV === "test"
      ? []
      : [SequelizeModule.forFeature([Person])]),
  ],
  controllers: [PersonController],
  providers: [
    PersonService,
    {
      provide: Providers.person,
      useClass: PersonProviderSequelize,
    },
  ],
  exports: [PersonService],
})
export class PersonModule {}
