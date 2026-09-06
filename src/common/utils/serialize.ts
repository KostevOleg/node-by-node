import { ClassConstructor, plainToInstance } from 'class-transformer';

export function serialize<T, V>(cls: ClassConstructor<T>, value: V[]): T[];
export function serialize<T, V>(cls: ClassConstructor<T>, value: V): T;
export function serialize<T, V>(cls: ClassConstructor<T>, value: V | V[]) {
  return plainToInstance(cls, value, {
    excludeExtraneousValues: true,
  });
}
