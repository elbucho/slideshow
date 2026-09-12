import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '@/app/app.module';
import { ErrorResponseFilter } from '@/common/error-response.filter';
import {
    TEST_USERS,
    seedTestUsers,
    seedTestSessions
} from '@test/seeds/auth-sessions.seed';
import { login } from '@test/helpers/auth';
import { testPagination } from '@test/helpers/parameters';
import { UsersService } from '@/users/users.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { TokensService } from '@/tokens/tokens.service';

describe('Sessions', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let usersService: UsersService;
    let sessionsService: SessionsService;
    let tokensService: TokensService;

    beforeAll(async () => {
        process.env['USER_MAX_SESSIONS'] = '10';

        const moduleFixture: TestingModule =
            await Test.createTestingModule({
                imports: [ AppModule ],
            }).compile();

        dataSource = moduleFixture.get(DataSource);

        app = moduleFixture.createNestApplication();
        app.useGlobalFilters(new ErrorResponseFilter());

        usersService = app.get<UsersService>(UsersService);
        sessionsService = app.get<SessionsService>(SessionsService);
        tokensService = app.get<TokensService>(TokensService);

        await app.init();
        await dataSource.query(
            'TRUNCATE TABLE "sessions" RESTART IDENTITY CASCADE'
        );
        await dataSource.query(
            'TRUNCATE TABLE "users" RESTART IDENTITY CASCADE'
        );

        await seedTestUsers(usersService);
        await seedTestSessions(
            sessionsService,
            tokensService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /auth/sessions', () => {
        it(
            'should fetch sessions associated with the ' +
            'logged-in user, and allow for pagination via ' +
            'the page and page_size query params',
            async () => {
                const response =
                    await login(
                        app,
                        TEST_USERS[0].username,
                        TEST_USERS[0].password,
                        200
                    );

                expect(response.body?.details?.access_token)
                    .toBeDefined();

                await testPagination(
                    app,
                    response.body.details.access_token,
                    '/auth/sessions',
                    'GET',
                    4
                );
            }
        );
    });
});