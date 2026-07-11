import { ISessionProvider } from '@/session/session.provider.interface';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSessionDto } from '@/session/dto/create-session.dto';
import { SessionRecord } from '@/session/entities/session.entity';
import { AbstractProviderFake } from '@test/abstract.provider.fake';

@Injectable()
export class SessionProviderFake extends AbstractProviderFake<SessionRecord> implements ISessionProvider {
  async findSessionByUserId(userId: number): Promise<SessionRecord> {
    const existing = this.records.find(
      (session: SessionRecord) => session.userId === userId
    );

    if (existing) {
      return existing;
    }

    throw new NotFoundException('Session not found');
  }

  async createSession(sessionRecord: CreateSessionDto): Promise<SessionRecord> {
    let existingSession: SessionRecord|null = null;

    try {
      existingSession = await this.findSessionByUserId(sessionRecord.userId);
    } catch (err) {
    }

    if (existingSession) {
      throw new BadRequestException('Session already exists');
    }

    return this.createRecord(sessionRecord);
  }

  async updateSession(sessionRecord: CreateSessionDto): Promise<SessionRecord> {
    let existingSession = await this.findSessionByUserId(sessionRecord.userId);
    existingSession = {
      ...existingSession,
      ...sessionRecord,
      updatedAt: new Date(),
    };

    return existingSession;
  }

  async deleteSession(userId: number): Promise<void> {
    let existingSession = await this.findSessionByUserId(userId);
    existingSession.deletedAt = new Date();

    return;
  }
}