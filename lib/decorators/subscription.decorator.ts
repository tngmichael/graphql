import { SetMetadata, Type } from '@nestjs/common';
import { isString } from '@nestjs/common/utils/shared.utils';
import 'reflect-metadata';
import { Resolvers } from '../enums/resolvers.enum';
import { SUBSCRIPTION_OPTIONS_METADATA } from '../graphql.constants';
import { BaseTypeOptions, ReturnTypeFunc } from '../interfaces';
import { ResolverTypeMetadata } from '../schema-builder/metadata';
import { LazyMetadataStorage } from '../schema-builder/storages/lazy-metadata.storage';
import { TypeMetadataStorage } from '../schema-builder/storages/type-metadata.storage';
import { reflectTypeFromMetadata } from '../utils/reflection.utilts';
import { addResolverMetadata } from './resolvers.utils';

/**
 * Interface defining options that can be passed to `@Subscription()` decorator.
 */
export interface SubscriptionOptions extends BaseTypeOptions {
  /**
   * Name of the subscription.
   */
  name?: string;
  /**
   * Description of the subscription.
   */
  description?: string;
  /**
   * Subscription deprecation reason (if deprecated).
   */
  deprecationReason?: string;
  /**
   * Filter messages function.
   */
  filter?: (
    payload: any,
    variables: any,
    context: any,
  ) => boolean | Promise<boolean>;
  /**
   * Resolve messages function (to transform payload/message shape).
   */
  resolve?: (
    payload: any,
    args: any,
    context: any,
    info: any,
  ) => any | Promise<any>;
}

/**
 * Subscription handler (method) Decorator. Routes subscriptions to this method.
 */
export function Subscription(): MethodDecorator;
/**
 * Subscription handler (method) Decorator. Routes subscriptions to this method.
 */
export function Subscription(name: string): MethodDecorator;
/**
 * Subscription handler (method) Decorator. Routes subscriptions to this method.
 */
export function Subscription(
  name: string,
  options: Pick<SubscriptionOptions, 'filter' | 'resolve'>,
): MethodDecorator;
/**
 * Subscription handler (method) Decorator. Routes subscriptions to this method.
 */
export function Subscription(
  typeFunc: ReturnTypeFunc,
  options?: SubscriptionOptions,
): MethodDecorator;
/**
 * Subscription handler (method) Decorator. Routes subscriptions to this method.
 */
export function Subscription(
  nameOrType?: string | ReturnTypeFunc,
  options: SubscriptionOptions = {},
): MethodDecorator {
  return (
    target: Record<string, any> | Function,
    key?: string,
    descriptor?: any,
  ) => {
    const name = isString(nameOrType)
      ? nameOrType
      : (options && options.name) || undefined;

    addResolverMetadata(Resolvers.SUBSCRIPTION, name, target, key, descriptor);
    SetMetadata(SUBSCRIPTION_OPTIONS_METADATA, options)(
      target,
      key,
      descriptor,
    );

    if (nameOrType && !isString(nameOrType)) {
      LazyMetadataStorage.store(target.constructor as Type<unknown>, () => {
        const { typeFn, options: typeOptions } = reflectTypeFromMetadata({
          metadataKey: 'design:returntype',
          prototype: target,
          propertyKey: key,
          explicitTypeFn: nameOrType,
          typeOptions: options,
        });
        const metadata: ResolverTypeMetadata = {
          methodName: key,
          schemaName: options.name || key,
          target: target.constructor,
          typeFn,
          returnTypeOptions: typeOptions,
          description: options.description,
          deprecationReason: options.deprecationReason,
        };
        TypeMetadataStorage.addSubscriptionMetadata(metadata);
      });
    }
  };
}
