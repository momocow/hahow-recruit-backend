import Koa from 'koa';
import { errorLogger, errorTranslator } from './errors';
import { negotiator } from './negotiator';
import hero from './routes/heroes';

export interface AppOptions {
  silent: boolean;
}

export function createApp(
  app: Koa = new Koa(),
  { silent = false }: Partial<AppOptions> = {},
): Koa {
  return app
    .use(errorTranslator())
    .use(errorLogger({ silent }))
    .use(negotiator())
    .use(hero());
}
