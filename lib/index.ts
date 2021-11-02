import Koa from 'koa';
import { auth } from './auth';
import { negotiator } from './negotiator';

export function createApp(app: Koa = new Koa()): Koa {
  app.use(negotiator());
  app.use(auth());
  return app;
}
