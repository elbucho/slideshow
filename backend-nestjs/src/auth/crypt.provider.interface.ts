export interface ICryptProvider {
  hash(value: string, hashRounds: number): Promise<string>;
  hashMatches(value: string, hash: string): Promise<boolean>;
}