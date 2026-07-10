import { ISessionProvider } from '@/session/session.provider.interface';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSessionDto } from '@/session/dto/create-session.dto';
import { SessionRecord } from '@/session/entities/session.entity';

@Injectable()
export class SessionProviderFake implements ISessionProvider {
  private sessions: SessionRecord[] = [];

  private async getNewId(): Promise<number> {
    let newId: number = 0;

    do {
      newId = Math.floor(Math.random() * 100);

      try {
        await this.findById(newId);
      } catch (NotFoundException) {
        return newId;
      }
    } while (1);

    return newId;
  }

  clear(): void {
    this.sessions = [];
  }

  seed(data: SessionRecord[]): void {
    this.sessions = data;
  }

  async findById(id: number): Promise<SessionRecord> {
    const existing = this.sessions.find((session) => session.id === id);

    if (existing) {
      return existing;
    }

    throw new NotFoundException('Session not found');
  }

  async findSessionByUserId(userId: number): Promise<SessionRecord> {
    const existing = this.sessions.find((session) => session.userId === userId);

    if (existing) {
      return existing;
    }

    throw new NotFoundException('Session not found');
  }

  async createSession(sessionRecord: CreateSessionDto): Promise<SessionRecord> {
    const id = await this.getNewId();
    let existingSession: SessionRecord|null = null;

    try {
      existingSession = await this.findSessionByUserId(sessionRecord.userId);
    } catch (err) {
    }

    if (existingSession) {
      throw new BadRequestException('Session already exists');
    }

    const session = { id: id, ...sessionRecord };
    this.sessions.push(session);

    return session;
  }

  updateSession(sessionRecord: CreateSessionDto): Promise<SessionRecord> {
    let existingSession = this.findSessionByUserId(sessionRecord.userId);
    existingSession = { ...existingSession, ...sessionRecord };

    return existingSession;
  }

  async deleteSession(userId: number): Promise<void> {
    let existingSession = await this.findSessionByUserId(userId);
    existingSession.deletedAt = new Date();

    return;
  }
}