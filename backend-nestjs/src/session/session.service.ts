import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { SessionRecord } from "@/session/entities/session.entity";
import { Providers } from "@/config";
import { ISessionProvider } from "@/session/session.provider.interface";

@Injectable()
export class SessionService {
  constructor(
    @Inject(Providers.session)
    private readonly sessionProvider: ISessionProvider,
  ) {}

  async getSessionByUserId(userId: number): Promise<SessionRecord> {
    return this.sessionProvider.findSessionByUserId(userId);
  }

  async getOrCreateSession(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<SessionRecord> {
    try {
      const session = await this.sessionProvider.findSessionByUserId(userId);

      return this.sessionProvider.updateSession({
        ...session,
        tokenHash: tokenHash,
        tokenExpiresAt: expiresAt,
      });
    } catch (err) {
      return this.sessionProvider.createSession({
        userId: userId,
        tokenHash: tokenHash,
        tokenExpiresAt: expiresAt,
      });
    }
  }

  async deleteSession(userId: number): Promise<void> {
    return this.sessionProvider.deleteSession(userId);
  }
}
