import Router from '@koa/router';
import { Unauthorized } from 'http-errors';
import Koa from 'koa';
import compose from 'koa-compose';
import { RequestInit } from 'node-fetch';
import { AbortSignal } from 'node-fetch/externals';
import {
  authenticate,
  fetchHero,
  fetchHeroes,
  fetchHeroProfile,
  Hero,
} from '../hahow';

export const hahowAuth: (ctx: Koa.Context) => Promise<boolean> = async (
  ctx,
) => {
  if ('name' in ctx.request.headers || 'password' in ctx.request.headers) {
    const name = ctx.get('Name');
    const password = ctx.get('Password');
    const authPassed = await authenticate(name, password);
    if (!authPassed) throw new Unauthorized();
    return true;
  }
  return false;
};

export async function loadProfile(
  hero: Hero,
  options?: RequestInit,
): Promise<Hero> {
  const profile = await fetchHeroProfile(hero.id, options);
  return Object.assign({}, hero, { profile });
}

export const getAllHeroes: Router.Middleware = async (ctx) => {
  const auth = await hahowAuth(ctx);
  let heroes = await fetchHeroes();
  if (auth) {
    // to abort parallel loadProfile()'s once any of them failed.
    const ctrl = new AbortController();
    heroes = await Promise.all(
      heroes.map((hero) =>
        // @TODO AbortSignal in @types/node
        //       lacks definitions to be an EventTarget
        loadProfile(hero, { signal: ctrl.signal as AbortSignal }).catch((e) => {
          if (!ctrl.signal.aborted) ctrl.abort();
          throw e;
        }),
      ),
    );
  }

  ctx.body = { heroes };
};

export const getOneHero: Router.Middleware = async (ctx) => {
  const auth = await hahowAuth(ctx);
  let hero = await fetchHero(ctx.params.id);
  if (auth) hero = await loadProfile(hero);
  ctx.body = hero;
};

export default function hero(): Koa.Middleware {
  const router = new Router({ prefix: '/heroes' })
    .get('/', getAllHeroes)
    .get('/:id', getOneHero); // @TODO validation rules for id?
  return compose([router.routes(), router.allowedMethods()]) as Koa.Middleware;
}
