import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { User } from '@/database/entities/user.entity';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
    let strategy: LocalStrategy;
    let authService: jest.Mocked<AuthService>;

    beforeAll(() => {
        authService = {
            verifyUser: jest.fn()
        } as any as jest.Mocked<AuthService>;

        strategy = new LocalStrategy(authService);
    });

    describe('validate', () => {
        it(
            'should call the authService.verifyUser function ' +
            'to verify that the username and password provided are correct',
            () => {
                const user = {} as any as User;
                const request = {} as any as Request;

                authService.verifyUser.mockResolvedValue(user);

                expect(
                    strategy.validate(
                        request,
                        'test@example.com',
                        'testPassword'
                    )
                ).resolves.toBe(user);

                expect(authService.verifyUser)
                    .toHaveBeenCalledWith(
                        'test@example.com',
                        'testPassword',
                        request
                    );
            }
        );
    });
});