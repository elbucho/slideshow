import { ConfigService } from '@nestjs/config';
import { UsersService } from '@/users/users.service';
import { AccessTokenPayload } from '@/auth/dtos/tokens.dto';
import { User } from '@/database/entities/user.entity';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import {
    InternalServerErrorException,
    ResourceNotFoundException,
    AuthenticationRequiredException
} from '@/common/exceptions';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let usersService: jest.Mocked<UsersService>;

    beforeEach(() => {
        usersService = {
            findById: jest.fn()
        } as any as jest.Mocked<UsersService>;

        const configService = {
            get: jest.fn()
        } as any as jest.Mocked<ConfigService>;

        configService.get
            .mockReturnValue('test-secret');

        strategy = new JwtStrategy(usersService, configService);
    });

    describe('validate', () => {
        it('should return a User if a valid token is provided', () => {
            const user = { } as any as User;

            const payload = {
                sub: 1
            } as any as AccessTokenPayload;

            usersService.findById
                .mockResolvedValueOnce(user);

            expect(
                strategy.validate(payload)
            ).resolves.toBe(user);

            expect(
                usersService.findById
            ).toHaveBeenCalledWith(
                1
            );
        });

        it('should throw an AuthenticationRequiredException if no user is returned', () => {
            const payload = {
                sub: 1
            } as any as AccessTokenPayload;

            usersService.findById.mockRejectedValueOnce(
                new ResourceNotFoundException('test message')
            );

            expect(
                strategy.validate(payload)
            ).rejects.toThrow(
                new AuthenticationRequiredException(
                    'Invalid token'
                )
            );
        });

        it('should throw an InternalServerErrorException if an Error is thrown', () => {
            const payload = {
                sub: 1
            } as any as AccessTokenPayload;

            usersService.findById.mockRejectedValueOnce(
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

                usersService.findById.mockRejectedValueOnce(
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
