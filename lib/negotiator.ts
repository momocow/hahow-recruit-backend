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

    // set to ctx.body may also change ctx.status,
    // however we don't want the status to be changed here.
    // eslint-disable-next-line max-len
    // @see https://github.com/koajs/koa/blob/65f9c939e173ff2fab82ee9229a2213690959426/lib/response.js#L134-L190
    const status = ctx.status;

    // acceptType must be in map since we provide keys of map to ctx.accepts()
    ctx.body = map[acceptType](ctx.body);
    ctx.status = status;
  };
}
