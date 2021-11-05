import { BadGateway, HttpError } from 'http-errors';
import Joi from 'joi';
import fetch, { RequestInit } from 'node-fetch';
import { TranslatableError } from './errors';

export class ApiGatewayError extends Error implements TranslatableError {
  public name = 'ApiGatewayError';
  public httpError = (): HttpError => new BadGateway();
}

export async function authenticate(
  name: string,
  password: string,
  options?: RequestInit,
): Promise<boolean> {
  const resp = await fetch('https://hahow-recruit.herokuapp.com/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, password }),
    ...options,
  });
  return resp.status === 200;
}

export async function fetchJson<T = unknown>(
  url: string,
  schema: Joi.Schema,
  options?: RequestInit,
): Promise<T> {
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    ...options,
  });

  if (resp.status !== 200) {
    throw new ApiGatewayError(
      `Got unexpected status (${resp.status} ${resp.statusText}) while ` +
        `requesting ${resp.url}`,
    );
  }

  const contentType = resp.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new ApiGatewayError(`Expect application/json, got ${contentType}`);
  }

  let data: unknown;
  try {
    data = await resp.json();
  } catch (e) {
    throw new ApiGatewayError('Failed to decode JSON data');
  }

  const { error, value } = schema.validate(data, { convert: false });
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

export async function fetchHeroes(options?: RequestInit): Promise<Hero[]> {
  return await fetchJson(
    'https://hahow-recruit.herokuapp.com/heroes',
    heroesSchema,
    options,
  );
}

export async function fetchHero(
  heroId: string,
  options?: RequestInit,
): Promise<Hero> {
  return await fetchJson(
    'https://hahow-recruit.herokuapp.com/heroes/' + heroId,
    heroSchema,
    options,
  );
}

export async function fetchHeroProfile(
  heroId: string,
  options?: RequestInit,
): Promise<HeroProfile> {
  return await fetchJson(
    'https://hahow-recruit.herokuapp.com/heroes/' + heroId + '/profile',
    heroProfileSchema,
    options,
  );
}
