import { BadGateway, HttpError } from 'http-errors';
import Joi from 'joi';
import fetch from 'node-fetch';
import { TranslatableError } from './errors';

export class ApiGatewayError extends Error implements TranslatableError {
  public name = 'ApiGatewayError';
  public httpError = (): HttpError => new BadGateway();
}

export async function authenticate(
  name: string,
  password: string,
): Promise<boolean> {
  const resp = await fetch('https://hahow-recruit.herokuapp.com/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, password }),
  });
  return resp.status === 200;
}

export function getHeroesUrl(heroId?: string): string {
  return (
    'https://hahow-recruit.herokuapp.com/heroes' + (heroId ? '/' + heroId : '')
  );
}

export async function fetchJson<T = unknown>(
  url: string,
  schema: Joi.Schema,
): Promise<T> {
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (resp.status !== 200) {
    throw new ApiGatewayError(
      `Got unexpected status (${resp.status} ${resp.statusText}) while ` +
        `requesting ${resp.url}`,
    );
  }

  const contentType = resp.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new ApiGatewayError(`Expect JSON, got ${contentType}`);
  }

  let data: unknown;
  try {
    data = await resp.json();
  } catch (e) {
    throw new ApiGatewayError('Failed to decode JSON data');
  }

  const { error, value } = schema.validate(data);
  if (error) {
    throw new ApiGatewayError('Invalid data');
  }

  return value as T;
}

export interface HeroProfile {
  str: number;
  int: number;
  agi: number;
  luk: number;
}

export interface Hero {
  id: string;
  name: string;
  image: string;
  profile?: HeroProfile;
}

export const heroProfileSchema = Joi.object({
  str: Joi.number().required(),
  int: Joi.number().required(),
  agi: Joi.number().required(),
  luk: Joi.number().required(),
});

export const heroSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  image: Joi.string().required(),
});

export const heroesSchema = Joi.array().items(heroSchema);

export async function fetchHeroes(): Promise<Hero[]> {
  return await fetchJson(
    'https://hahow-recruit.herokuapp.com/heroes',
    heroesSchema,
  );
}

export async function fetchHero(heroId: string): Promise<Hero> {
  return await fetchJson(
    'https://hahow-recruit.herokuapp.com/heroes/' + heroId,
    heroSchema,
  );
}

export async function fetchHeroProfile(heroId: string): Promise<HeroProfile> {
  return await fetchJson(
    'https://hahow-recruit.herokuapp.com/heroes/' + heroId + '/profile',
    heroProfileSchema,
  );
}
