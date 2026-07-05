import { ISessionProvider } from "@/session/session.provider.interface";
import { CreateSessionDto } from "@/session/dto/create-session.dto";
import { Session, SessionRecord } from "@/session/entities/session.entity";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";

@Injectable()
export class SessionProviderSequelize implements ISessionProvider {
  constructor(
    @InjectModel(Session) private readonly sessionEntity: typeof Session
  ) {}
  
  private async findSessionModelByUserId(userId: number): Promise<Session> {
    const session = await this.sessionEntity.findOne({where: {userId: userId}});

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    return session;
  }
  
  async createSession(sessionDto: CreateSessionDto): Promise<SessionRecord> {
    const session = await this.sessionEntity.create(sessionDto).catch(() => {
      throw new BadRequestException("Session already exists");
    });

    return session.toJSON();
  }

  async deleteSession(userId: number): Promise<void> {
    const session = await this.findSessionModelByUserId(userId);

    if (session) {
      return session.destroy();
    }
  }

  async findSessionByUserId(userId: number): Promise<SessionRecord> {
    return (await this.findSessionModelByUserId(userId)).toJSON();
  }

  async updateSession(sessionDto: CreateSessionDto): Promise<SessionRecord> {
    const session = await this.findSessionModelByUserId(sessionDto.userId);

    return (await (session.update(sessionDto))).toJSON();
  }
  
}