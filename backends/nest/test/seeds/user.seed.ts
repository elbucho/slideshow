import { DataSource } from 'typeorm';
import { User } from '@/database/entities/user.entity';

export async function seedTestUser(
    dataSource: DataSource
): Promise<User> {
    const repository =
        dataSource.getRepository(User);

    const user = repository.create({
        email: 'test@example.com',
    });

    await user.setPassword('test-password');

    return repository.save(user);
}