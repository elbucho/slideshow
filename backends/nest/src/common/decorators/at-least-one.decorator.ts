import {
    getMetadataStorage,
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraintInterface,
} from 'class-validator';

export function hasAtLeastOneNonEmptyField(
    object: Record<string, unknown>,
    fields: string[]
): boolean {
    return fields.some(field => {
        const value = object[field];

        if (value === null || value === undefined) {
            return false;
        }

        return !(
            typeof value === 'string' &&
            value.trim() === ''
        );
    });
}

export function getValidatedPropertyNames(
    target: Function
): string [] {
    const metadatas = getMetadataStorage()
        .getTargetValidationMetadatas(
            target,
            target.name,
            false,
            false
        );

    return [
        ...new Set(
            metadatas.map(
                m => m.propertyName
            )
        )
    ].filter(
        name => name !== '__atLeastOne'
    );
}

// Pulled out so it can be unit-tested directly, with a fake
// ValidationArguments object, no class-validator plumbing required.
export const atLeastOneValidator: ValidatorConstraintInterface = {
    validate(_value: unknown, args: ValidationArguments): boolean {
        const fields = getValidatedPropertyNames(
            args.object.constructor
        );

        return hasAtLeastOneNonEmptyField(
            args.object as Record<string, unknown>,
            fields
        );
    },

    defaultMessage(): string {
        return 'At least one field must be provided';
    }
};

export function definePhantomProperty(target: Function): void {
    Object.defineProperty(target.prototype, '__atLeastOne', {
        configurable: true,
        enumerable: false,
        get: () => undefined,
    });
}

export function AtLeastOne(
    validationOptions?: ValidationOptions
): ClassDecorator {
    return (target: Function) => {
        definePhantomProperty(target);

        registerDecorator({
            name: 'atLeastOne',
            target,
            propertyName: '__atLeastOne',
            options: validationOptions,
            validator: atLeastOneValidator
        });
    }
}