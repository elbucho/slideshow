import { PartialType } from "@nestjs/swagger";
import { CreatePersonDto } from "@/person/dto/create-person.dto";

export class UpdatePersonDto extends PartialType(CreatePersonDto) { }
