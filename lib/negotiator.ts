import Koa from 'koa';

export type ResponseFormatter = (body: unknown) => string;
export type NegotiationMap = Record<string, ResponseFormatter>;

export const defaultNegotiationMap: Readonly<NegotiationMap> = {
  json: (body: unknown) => JSON.stringify(body),
};

export function negotiator(
  map: NegotiationMap = defaultNegotiationMap,
): Koa.Middleware {
  const availableTypes = Object.keys(map);

  // explicitly declare ctx a type to avoid TS(2775) error for ctx.assert
  // eslint-disable-next-line max-len
  // @see https://github.com/microsoft/TypeScript/issues/33580#issuecomment-534632977
  return async function formatResponse(ctx: Koa.Context, next) {
    const acceptType = ctx.accepts(availableTypes);
    ctx.assert(acceptType !== false, 406);
    await next();
    ctx.body = map[acceptType](ctx.body);
  };
}
