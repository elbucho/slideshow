import {
    AtLeastOne,
    atLeastOneValidator,
    definePhantomProperty,
    hasAtLeastOneNonEmptyField
} from '@/common/decorators/at-least-one.decorator';
import {
    ValidationArguments,
    IsOptional,
    IsEmail,
    IsNotEmpty
} from 'class-validator';

class DummyDto {
    @IsOptional()
    @IsEmail()
    email!: string;

    @IsOptional()
    @IsNotEmpty()
    username!: string;
}

const fakeArgs = (object: unknown): ValidationArguments =>
    ({ object } as ValidationArguments);

describe('AtLeastOne', () => {
    describe('hasAtLeastOneNonEmptyField', () => {
        it(
            'returns true when a field has a non-empty value',
            () => {
                expect(
                    hasAtLeastOneNonEmptyField({
                        foo: 'bar'
                    }, [ 'foo' ])
                ).toBe(true);
            }
        );

        it(
            'returns false when no fields have a non-empty value',
            () => {
                expect(
                    hasAtLeastOneNonEmptyField({
                        a: null,
                        b: undefined,
                        c: ' '
                    }, [ 'a', 'b', 'c' ])
                ).toBe(false);
            }
        );

        it(
            'returns true for non-string falsy values',
            () => {
                expect(
                    hasAtLeastOneNonEmptyField({
                        a: 0,
                        b: false
                    }, [ 'a', 'b' ])
                ).toBe(true);
            }
        );

        it(
            'returns false when no defined fields are passed',
            () => {
                expect(
                    hasAtLeastOneNonEmptyField({
                        b: 'bar'
                    }, [ 'a' ])
                ).toBe(false);
            }
        )
    });

    describe('atLeastOneValidator', () => {
        it(
            'returns true from validate() when a decorated ' +
            'field is non-empty',
            () => {
                const instance = Object.assign(
                    new DummyDto(),
                    {
                        email: 'a@b.com'
                    }
                );

                expect(
                    atLeastOneValidator.validate(
                        undefined,
                        fakeArgs(instance)
                    )
                ).toBe(true);
            }
        );

        it(
            'returns false from validate() when all decorated ' +
            'fields are empty',
            () => {
                const instance = Object.assign(
                    new DummyDto(),
                    {
                        email: '',
                        username: undefined
                    }
                );

                expect(
                    atLeastOneValidator.validate(
                        undefined,
                        fakeArgs(instance)
                    )
                ).toBe(false);
            }
        );

        it(
            'ignores undeclared properties not on the class',
            () => {
                const instance = Object.assign(
                    new DummyDto(),
                    {
                        foo: 'bar'
                    }
                );

                expect(
                    atLeastOneValidator.validate(
                        undefined,
                        fakeArgs(instance)
                    )
                ).toBe(false);
        });

        it(
            'sets the default message if validation fails',
            () => {
                expect(
                    atLeastOneValidator.defaultMessage!()
                ).toBe(
                    'At least one field must be provided'
                );
            }
        );
    });

    describe('definePhantomProperty', () => {
        it(
            'defines a non-enumerable getter that returns undefined',
            () => {
                class Dummy {}
                definePhantomProperty(Dummy);

                const instance = new Dummy();

                expect(
                    (instance as any).__atLeastOne
                ).toBeUndefined();

                expect(
                    Object.getOwnPropertyDescriptor(
                        Dummy.prototype,
                        '__atLeastOne'
                    )?.enumerable
                ).toBe(false);
            }
        );
    });

    describe('AtLeastOne', () => {
        it(
            'applies definePhantomProperty and registers ' +
            'without throwing',
            () => {
                expect(() => {
                    @AtLeastOne()
                    class Dummy {
                        a?: string;
                    }
                    new Dummy();
                }).not.toThrow();
            }
        );
    });
});