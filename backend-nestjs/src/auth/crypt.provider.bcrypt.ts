import { ICryptProvider } from "@/auth/crypt.provider.interface";
import * as bcrypt from "bcrypt";

export class CryptProviderBcrypt implements ICryptProvider {
  async hash(value: string, hashRounds: number): Promise<string> {
    return bcrypt.hash(value, hashRounds);
  }

  async hashMatches(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}