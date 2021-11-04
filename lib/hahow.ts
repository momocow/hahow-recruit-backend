import { BadGateway, HttpError } from 'http-errors';
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

export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (resp.status !== 200)
    throw new ApiGatewayError(
      `${resp.url} (${resp.status} ${resp.statusText})`,
    );
  return await resp.json();
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

export async function fetchHeroes(): Promise<Hero[]> {
  return await fetchJson('https://hahow-recruit.herokuapp.com/heroes');
}

export async function fetchHero(heroId: string): Promise<Hero> {
  return await fetchJson(
    'https://hahow-recruit.herokuapp.com/heroes/' + heroId,
  );
}

export async function fetchHeroProfile(heroId: string): Promise<HeroProfile> {
  return await fetchJson(
    'https://hahow-recruit.herokuapp.com/heroes/' + heroId + '/profile',
  );
}
