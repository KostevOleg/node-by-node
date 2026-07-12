import { ClassConstructor, plainToInstance } from 'class-transformer';

export const serialize = <T, V>(cls: ClassConstructor<T>, value: V) =>
  plainToInstance(cls, value, {
    excludeExtraneousValues: true,
  });
