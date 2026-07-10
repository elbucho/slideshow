import { SessionRecord } from "@/session/entities/session.entity";
import { CreateSessionDto } from "@/session/dto/create-session.dto";

export interface ISessionProvider {
  findSessionByUserId(userId: number): Promise<SessionRecord>;
  createSession(sessionRecord: CreateSessionDto): Promise<SessionRecord>;
  updateSession(sessionRecord: CreateSessionDto): Promise<SessionRecord>;
  deleteSession(userId: number): Promise<void>;
}