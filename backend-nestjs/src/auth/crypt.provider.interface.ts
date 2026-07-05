export interface ICryptProvider {
  hash(value: string, hashRounds: number): Promise<string>;
  hashMatches(password: string, hash: string): Promise<boolean>;
}