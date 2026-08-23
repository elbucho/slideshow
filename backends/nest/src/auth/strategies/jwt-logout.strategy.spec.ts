import { ConfigService } from '@nestjs/config';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { AccessTokenPayload } from '@/auth/dtos/tokens.dto';
import { Session } from '@/database/entities/session.entity';
import { JwtLogoutStrategy } from '@/auth/strategies/jwt-logout.strategy';
import {
    InternalServerErrorException,
    ResourceNotFoundException,
    SessionNotFoundException
} from '@/common/exceptions';

describe('JwtLogoutStrategy', () => {
    let strategy: JwtLogoutStrategy;
    let sessionsService: jest.Mocked<SessionsService>;

    beforeEach(() => {
        const configService = {
            get: jest.fn()
        } as any as jest.Mocked<ConfigService>;

        sessionsService = {
            findById: jest.fn()
        } as any as jest.Mocked<SessionsService>;

        configService.get
            .mockReturnValue('test-secret');

        strategy = new JwtLogoutStrategy(sessionsService, configService);
    });

    describe('validate', () => {
        it('should return a Session if a valid token is provided', () => {
            const session = { } as any as Session;

            const payload = {
                sid: 1
            } as any as AccessTokenPayload;

            sessionsService.findById
                .mockResolvedValueOnce(session);

            expect(
                strategy.validate(payload)
            ).resolves.toBe(session);

            expect(
                sessionsService.findById
            ).toHaveBeenCalledWith(
                1
            );
        });

        it('should throw an InvalidCredentialsException if no session is returned', () => {
            const payload = {
                sub: 1
            } as any as AccessTokenPayload;

            sessionsService.findById.mockRejectedValueOnce(
                new ResourceNotFoundException('test message')
            );

            expect(
                strategy.validate(payload)
            ).rejects.toThrow(
                new SessionNotFoundException(
                    'Invalid token'
                )
            );
        });

        it('should throw an InternalServerErrorException if an Error is thrown', () => {
            const payload = {
                sub: 1
            } as any as AccessTokenPayload;

            sessionsService.findById.mockRejectedValueOnce(
                new Error('test message')
            );

            expect(
                strategy.validate(payload)
            ).rejects.toThrow(
                new InternalServerErrorException(
                    'test message'
                )
            );
        });

        it(
            'should throw an InternalServerErrorException with a ' +
            'generic message if a non-standard error was thrown',
            () => {
                const payload = {
                    sub: 1
                } as any as AccessTokenPayload;

                sessionsService.findById.mockRejectedValueOnce(
                    {}
                );

                expect(
                    strategy.validate(payload)
                ).rejects.toThrow(
                    new InternalServerErrorException(
                        'Internal server error'
                    )
                );
            }
        );
    });
});
