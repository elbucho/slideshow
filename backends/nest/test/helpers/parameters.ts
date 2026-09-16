import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import Test from 'supertest/lib/test';
import { defaultQueryOptions } from
        '@/database/decorators/query-options.decorator';
import { BaseEntity } from
        '@/database/entities/base.entity';
import { QueryFieldRegistry } from
        '@/database/queries/query-field.registry';
import {
    getSimplifiedColumnType,
    SimplifiedColumnType
} from '@/database/helpers/column-type.helper';

function getRequest(
    app: INestApplication,
    path: string,
    method: string,
    token: string
): Test {
    const req = request(
        app.getHttpServer()
    );

    const test = useMethod(
        req,
        method,
        path
    );

    return test.set(
        'Authorization',
        `Bearer ${token}`
    );
}

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
                `Unsupported HTTP method: ` +
                `${method}`
            );
    }
}

function getSortFields(
    repository: Repository<BaseEntity>,
    maxFields: number
): string[] {
    const { sortableFields } = QueryFieldRegistry.get(
        repository.metadata.target as Function
    );

    const fieldCount = Math.min(
        maxFields,
        sortableFields.length
    );

    const remaining = [ ...sortableFields ];
    const picked = [];

    for (let i=0;i<fieldCount;i++) {
        const index = Math.floor(
            Math.random() * remaining.length
        );

        let field = remaining[index];

        if (index % 2 === 1) {
            field = `-${field}`;
        }

        picked.push(field);
        remaining.splice(index, 1);
    }

    return picked;
}

function getColumnType(
    field: string,
    repository: Repository<BaseEntity>
): SimplifiedColumnType {
    const column =
        repository.metadata
            .findColumnWithPropertyName(
                field
            );

    if (!column) {
        throw Error(
            `Column ${field} was not found`
        );
    }

    const columnType = column.type;

    return getSimplifiedColumnType(field, columnType);
}

function compareStrings(
    a: string,
    b: string
): number {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    if (aLower < bLower) return -1;
    if (aLower > bLower) return 1;
    return 0;
}

function compareItems(
    a: unknown,
    b: unknown,
    type: SimplifiedColumnType
): number {
    // Nulls sort after non-null values in Postgres.
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    switch (type) {
        case 'number':
            return Number(a) - Number(b);
        case 'date':
            return new Date(String(a)).getTime()
                - new Date(String(b)).getTime();
        case 'string':
            return compareStrings(String(a), String(b));
        default:
            // No comparison should be made on
            // structured or binary data
            return 0;
    }
}

function arrayMatchesSort(
    records: Record<string, string>[],
    sortField: string,
    repository: Repository<BaseEntity>
): boolean {
    const field = sortField.replace(
        /^-/,
        ''
    );

    const direction =
        Array.from(sortField)[0] === '-'
            ? 'DESC'
            : 'ASC';

    const columnType = getColumnType(
        field,
        repository
    );

    for (let i=0;i<records.length - 1;i++) {
        const comparison = compareItems(
            records[i][field],
            records[i+1][field],
            columnType
        );

        if (direction === 'DESC' && comparison < 0)
            return false;

        if (direction === 'ASC' && comparison > 0)
            return false;
    }

    return true;
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
            'Must provide at least 2 ' +
            'test entities'
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
        const test = getRequest(
            app,
            path,
            method,
            token
        );

        const response =
            await test.query({
                page: i + 1,
                pageSize
            }).expect(200);

        expect(response.body?.details?.items)
            .toBeDefined();

        expect(
            Array.isArray(
                response.body?.details?.items
            )
        ).toBe(true);

        expect(
            response.body.details.items.length
        ).toBeLessThanOrEqual(pageSize);

        expect(response).toSatisfyApiSpec(
            path,
            method.toUpperCase()
        );
    }
}

export async function testSort(
    app: INestApplication,
    token: string,
    path: string,
    method: string,
    repository: Repository<BaseEntity>
): Promise<void> {
    const configService =
        app.get(ConfigService);

    const sortFields = getSortFields(
        repository,
        configService.get(
            'test.sort.maxFields'
        ) as number
    );

    for (const sortField of sortFields) {
        const test = getRequest(
            app,
            path,
            method,
            token
        );

        const response =
            await test.query({
                sort: sortField
            }).expect(200);

        expect(response.body?.details?.items)
            .toBeDefined();

        expect(
            arrayMatchesSort(
                response.body.details.items,
                sortField,
                repository
            )
        ).toBe(true);
    }
}

export async function testIncludeDeleted(
    app: INestApplication,
    token: string,
    path: string,
    method: string,
    repository: Repository<BaseEntity>
): Promise<void> {
    const recordToDelete =
        await repository
            .createQueryBuilder()
            .orderBy('RANDOM()')
            .getOne();

    if (!recordToDelete) {
        throw new Error(
            'Must have at least one non-deleted ' +
            'entity available in the provided repository'
        );
    }

    await repository.softDelete({
        id: recordToDelete.id
    });

    const response =
        await getRequest(
            app,
            path,
            method,
            token
        ).query({
            pageSize: 100,
            includeDeleted: true
        }).expect(200);

    expect(response.body?.details?.items)
        .toBeDefined();

    expect(Array.isArray(
        response.body.details.items
    )).toBe(true);

    const items: Record<string, string>[] =
        response.body.details.items;

    const matchingEntity = items.find(
        (e) =>
            Number(e.id) === recordToDelete.id
    );

    expect(matchingEntity).toBeDefined();

    expect(response).toSatisfyApiSpec(
        path,
        method
    );

    await repository.restore({
        id: recordToDelete.id
    });
}