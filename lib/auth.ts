import Koa from 'koa';
import fetch from 'node-fetch';

export const HAHOW_AUTH_URL = 'https://hahow-recruit.herokuapp.com/auth';

export interface AuthContext extends Koa.DefaultContext {
  authPassed: boolean;
}

export function auth(): Koa.Middleware<Koa.DefaultState, AuthContext> {
  return async function authenticate(ctx, next) {
    const name = ctx.get('Name');
    const password = ctx.get('Password');
    // @TODO further check?
    if (name && password) {
      const resp = await fetch(HAHOW_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // @TODO all requests with invalid credentials are thrown?
      if (resp.status !== 200) return ctx.throw(resp.status);
    }
    ctx.authPassed = true;
    await next();
  };
}
