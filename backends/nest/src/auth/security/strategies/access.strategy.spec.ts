import { ConfigService } from '@nestjs/config';
import { AccessStrategy } from './access.strategy';
import { AccessTokenPayload } from '@/tokens/dtos/tokens.dto';

describe('AccessStrategy', () => {
    let strategy: AccessStrategy;

    const payload = {
        sub: 1,
        sid: 1
    } as any as AccessTokenPayload;

    beforeAll(() => {
        const configService = {
            get: jest.fn()
        } as any as jest.Mocked<ConfigService>;

        configService.get
            .mockReturnValue('test-secret-access');

        strategy = new AccessStrategy(
            configService
        );
    });

    describe('validate', () => {
        it(
            'should return an AuthContext if the token is valid',
            async () => {
                await expect(
                    strategy.validate(
                        payload
                    )
                ).resolves.toStrictEqual(
                    {
                        userId: payload.sub,
                        sessionId: payload.sid
                    }
                );
            }
        );
    });
});