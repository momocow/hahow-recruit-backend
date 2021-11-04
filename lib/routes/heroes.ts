import Router from '@koa/router';
import { Unauthorized } from 'http-errors';
import Koa from 'koa';
import compose from 'koa-compose';
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

export async function loadProfile(hero: Hero): Promise<Hero> {
  const profile = await fetchHeroProfile(hero.id);
  return Object.assign({}, hero, { profile });
}

export const getAllHeroes: Router.Middleware = async (ctx) => {
  let heroes = await fetchHeroes();
  if (await hahowAuth(ctx)) {
    // @TODO use async.parallelLimit
    // if a limit of maximum concurrencies is required
    heroes = await Promise.all(heroes.map((hero) => loadProfile(hero)));
  }

  ctx.body = { heroes };
};

export const getOneHero: Router.Middleware = async (ctx) => {
  let hero = await fetchHero(ctx.params.id);
  if (await hahowAuth(ctx)) {
    hero = await loadProfile(hero);
  }
  ctx.body = hero;
};

export default function hero(): Koa.Middleware {
  const router = new Router({ prefix: '/heroes' })
    .get('/', getAllHeroes)
    .get('/:id', getOneHero); // @TODO validation rules for id?
  return compose([router.routes(), router.allowedMethods()]) as Koa.Middleware;
}
