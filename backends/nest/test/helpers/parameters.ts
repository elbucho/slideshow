import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { defaultQueryOptions } from
        '@/database/decorators/query-options.decorator';
import TestAgent from 'supertest/lib/agent';
import Test from 'supertest/lib/test';

function useMethod(
    req: TestAgent<Test>,
    method: string,
    path: string
): Test {
    switch(method.toUpperCase()) {
        case 'GET':
            return req.get(path);
        case 'POST':
            return req.post(path);
        case 'PUT':
            return req.put(path);
        case 'PATCH':
            return req.patch(path);
        case 'DELETE':
            return req.delete(path);

        default:
            throw new Error(
                `Unsupported HTTP method: ${method}`
            );
    }
}

export async function testPagination(
    app: INestApplication,
    token: string,
    path: string,
    method: string,
    numEntities: number
): Promise<void> {
    if (numEntities < 2) {
        throw Error(
            'Must provide at least 2 test entities'
        );
    }

    const pageSize = Math.min(
        Math.ceil(numEntities / 3),
        defaultQueryOptions.pageSize
    );

    const numPages = Math.ceil(
        numEntities / pageSize
    );

    for (let i=0;i<numPages;i++) {
        const req = request(app.getHttpServer());
        let test = useMethod(
            req,
            method,
            path
        );

        test = test.set(
            'Authorization',
            `Bearer ${token}`
        ).query({
            page: i + 1,
            page_size: pageSize
        });

        const response = await test.expect(200);

        expect(response.body?.details?.items)
            .toBeDefined();

        expect(Array.isArray(response.body?.details?.items))
            .toBe(true);

        expect(response).toSatisfyApiSpec(
            path,
            method.toUpperCase()
        );
    }
}