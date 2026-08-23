import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { RefreshTokenPayload } from '@/auth/dtos/tokens.dto';
import { User } from '@/database/entities/user.entity';
import { JwtRefreshStrategy } from '@/auth/strategies/jwt-refresh.strategy';
import { InvalidCredentialsException } from '@/common/exceptions';

describe('JwtRefreshStrategy', () => {
    let strategy: JwtRefreshStrategy;
    let authService: jest.Mocked<AuthService>;

    beforeEach(() => {
        const configService = {
            get: jest.fn()
        } as unknown as jest.Mocked<ConfigService>;

        authService = {
            verifyToken: jest.fn()
        } as unknown as jest.Mocked<AuthService>;

        configService.get
            .mockReturnValue('test-secret');

        strategy = new JwtRefreshStrategy(authService, configService);
    });

    describe('validate', () => {
        it('should return a User if a valid token is provided', () => {
            const request = {
                headers: {
                    authorization: "Bearer test-token"
                },
                cookies: {

                }
            } as any as Request;

            const user = {
                id: 1
            } as any as User;

            const payload = {
                sub: 123
            } as any as RefreshTokenPayload;

            authService.verifyToken.mockResolvedValue(user);

            expect(
                strategy.validate(request, payload)
            ).resolves.toBe(user);

            expect(
                authService.verifyToken
            ).toHaveBeenCalledWith(
                'test-token',
                123
            );
        });

        it('should throw an InvalidCredentialsException if no token is returned', () => {
            const request = {
                headers: {},
                cookies: {}
            } as any as Request;

            const payload = {
                sub: 123
            } as any as RefreshTokenPayload;

            expect(
                strategy.validate(request, payload)
            ).rejects.toThrow(
                new InvalidCredentialsException(
                    'Invalid token'
                )
            );
        });
    });
});