import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { AppModule } from '@/app/app.module';
import { ErrorResponseFilter } from '@/common/error-response.filter';
import { UsersService } from '@/users/users.service';
import { seedTestUser } from '@test/seeds/user.seed';
import { login } from '@test/helpers/auth';

describe('Auth', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let auditLogs: Repository<AuditLog>;
    let users: Repository<User>;
    let sessions: Repository<Session>;

    beforeAll(async () => {
        const moduleFixture: TestingModule =
            await Test.createTestingModule({
                imports: [ AppModule ],
            }).compile();

        dataSource = moduleFixture.get(DataSource);
        auditLogs = dataSource.getRepository(AuditLog);
        users = dataSource.getRepository(User);
        sessions = dataSource.getRepository(Session);

        app = moduleFixture.createNestApplication();
        app.useGlobalFilters(new ErrorResponseFilter());

        const usersService = app.get<UsersService>(
            UsersService
        );

        await app.init();
        await dataSource.query(
            'TRUNCATE TABLE "users" RESTART IDENTITY CASCADE'
        );

        await seedTestUser(usersService);
    });

    beforeEach(async () => {
        await auditLogs.clear();
        await dataSource.query(
            'TRUNCATE TABLE "sessions" RESTART IDENTITY CASCADE'
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /auth/login', () => {
        it(
            'should authenticate the user when ' +
            'proper credentials are supplied',
            async () => {
                for (
                    const identifier of [
                        'test-user',
                        'test@example.com'
                    ]
                ) {
                    const response = await login(
                        app,
                        identifier
                    );

                    expect(response).toSatisfyApiSpec(
                        '/auth/login',
                        'POST'
                    );
                }
            }
        );
    });
});