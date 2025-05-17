import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  hash(value: string): string {
    const hashRounds = +this.configService.get("BCRYPT_HASH_ROUNDS") || 10;

    return bcrypt.hashSync(value, hashRounds);
  }
}
