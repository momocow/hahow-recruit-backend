import Koa from 'koa';

export function mockContext(ctx: unknown): Koa.Context {
  return ctx as Koa.Context;
}
