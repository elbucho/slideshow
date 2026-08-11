import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '@/database/entities/session.entity';
import { CreateSessionDto } from '@/sessions/dtos/create-session.dto';
import { ResourceNotFoundException } from '@/common/types';

@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(Session)
        private readonly sessions: Repository<Session>
    ) { }

    async findById(id: number): Promise<Session> {
        const session = await this.sessions.findOne({
            where: { id: id },
            relations: {
                user: true
            }
        });

        if (!session) {
            throw new ResourceNotFoundException(
                'Unable to locate the requested session',
                {
                    id: id
                }
            );
        }

        return session;
    }

    async findByUserId(userId: number): Promise<Session[]> {
        return this.sessions.find({
            where: { userId: userId },
            relations: {
                user: true
            }
        });
    }

    async getOrCreateSession(sessionDto: CreateSessionDto): Promise<Session> {
        let session = await this.sessions.findOneBy(sessionDto);

        if (!session) {
            session = this.sessions.create(sessionDto);
            session = await this.sessions.save(session);
        }

        return session;
    }

    async saveSession(session: Session): Promise<void> {
        await this.sessions.save(session);
    }

    async deleteSession(session: Session): Promise<void> {
        await this.sessions.softRemove(session);
    }
}