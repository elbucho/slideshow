import {
  Inject,
  Injectable,
  forwardRef,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Session } from "./entities/session.entity";
import { AuthService } from "src/auth/auth.service";
import { Includeable } from "sequelize";

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session) private sessionProvider: typeof Session,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async getSessionByUserId(
    userId: number,
    includeModels: Includeable[] = [],
  ): Promise<Session> {
    const session = await this.sessionProvider.findOne({
      where: {
        userId: userId,
      },
      include: includeModels,
    });

    if (!session) {
      throw new NotFoundException();
    }

    return session;
  }

  async getOrCreateSession(
    userId: number,
    token: string,
    expiresAt: Date,
  ): Promise<Session> {
    const tokenHash = this.authService.hash(token);

    const [session, created] = await this.sessionProvider.findOrCreate({
      where: {
        userId: userId,
      },
      defaults: {
        userId: userId,
        tokenHash: tokenHash,
        tokenExpiresAt: expiresAt,
      },
    });

    if (created) {
      return session;
    }

    session.tokenHash = tokenHash;
    session.tokenExpiresAt = expiresAt;

    return session.save();
  }

  async deleteSession(userId: number): Promise<boolean> {
    try {
      const session = await this.getSessionByUserId(userId);
      await session.destroy().catch(() => false);

      return true;
    } catch (err) {
      return false;
    }
  }
}
