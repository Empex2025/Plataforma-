import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { isValidDocument, type PersonType } from './document.js';

export function IsDocument(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isDocument',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const { personType } = args.object as { personType?: PersonType };
          if (typeof value !== 'string' || !personType) return false;
          return isValidDocument(value, personType);
        },
        defaultMessage(args: ValidationArguments): string {
          const { personType } = args.object as { personType?: PersonType };
          return personType === 'PJ' ? 'CNPJ inválido' : 'CPF inválido';
        },
      },
    });
  };
}
