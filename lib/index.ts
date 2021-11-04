import Koa from 'koa';
import { errorLogger, errorTranslator } from './errors';
import { negotiator } from './negotiator';
import hero from './routes/heroes';

export function createApp(app: Koa = new Koa()): Koa {
  return app
    .use(errorTranslator())
    .use(errorLogger())
    .use(negotiator())
    .use(hero());
}
