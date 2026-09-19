import { User } from '@/database/entities/user.entity';
import { UsersService } from '@/users/users.service';

export const TEST_USER = {
    username: 'test-user',
    email: 'test@example.com',
    password: 'test-password'
};

export async function seedTestUser(
    usersService: UsersService
): Promise<User> {
    return usersService.createUser(TEST_USER);
}