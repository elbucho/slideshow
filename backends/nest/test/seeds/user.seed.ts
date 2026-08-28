import { User } from '@/database/entities/user.entity';
import { UsersService } from '@/users/users.service';

export async function seedTestUser(
    usersService: UsersService
): Promise<User> {
    return usersService.createUser({
        email: 'test@example.com',
        username: 'test-user',
        password: 'test-password'
    });
}