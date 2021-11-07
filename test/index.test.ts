import fetch from 'jest-fetch-mock';
import omit from 'lodash/omit';
import request from 'supertest';
import { createApp } from '../lib/index';

function createAppCallback() {
  const app = createApp(undefined, { silent: true });
  app.silent = true;
  return app.callback();
}

describe('success', () => {
  const heroes = [
    {
      id: '1',
      name: 'Daredevil',
      image:
        'http://i.annihil.us/u/prod/marvel/i/mg/6/90/537ba6d49472b/' +
        'standard_xlarge.jpg',
      profile: { str: 2, int: 7, agi: 9, luk: 7 },
    },
    {
      id: '2',
      name: 'Thor',
      image:
        'http://x.annihil.us/u/prod/marvel/i/mg/5/a0/537bc7036ab02/' +
        'standard_xlarge.jpg',
      profile: { str: 8, int: 2, agi: 5, luk: 9 },
    },
  ];
  const plainHeroes = heroes.map((hero) => omit(hero, 'profile'));

  const headers = { 'Content-Type': 'application/json' };

  beforeEach(() => {
    fetch.mockResponse(async (req) => {
      if (req.url.endsWith('/heroes')) {
        return { body: JSON.stringify(plainHeroes), status: 200, headers };
      } else if (/\/heroes\/\d$/.test(req.url)) {
        const id = req.url.slice(-1);
        return {
          body: JSON.stringify(plainHeroes.find((hero) => hero.id === id)),
          status: 200,
          headers,
        };
      } else if (req.url.endsWith('/auth')) {
        return { status: 200, headers };
      } else if (req.url.endsWith('/profile')) {
        const id = req.url.slice(-9, -8);
        return {
          body: JSON.stringify(heroes.find((hero) => hero.id === id)!.profile),
          status: 200,
          headers,
        };
      }
      return { status: 404 };
    });
  });

  test('GET /heroes without auth', async () => {
    await request(createAppCallback())
      .get('/heroes')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect({ heroes: plainHeroes });
  });

  test('GET /heroes with auth', async () => {
    await request(createAppCallback())
      .get('/heroes')
      .set('Accept', 'application/json')
      .set('Name', 'foo')
      .set('Password', 'bar')
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect({ heroes });
  });

  test('GET /heroes/1 without auth', async () => {
    await request(createAppCallback())
      .get('/heroes/1')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect({
        id: '1',
        name: 'Daredevil',
        image:
          'http://i.annihil.us/u/prod/marvel/i/mg/6/90/537ba6d49472b/' +
          'standard_xlarge.jpg',
      });
  });

  test('GET /heroes/1 with auth', async () => {
    await request(createAppCallback())
      .get('/heroes/1')
      .set('Accept', 'application/json')
      .set('Name', 'foo')
      .set('Password', 'bar')
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect({
        id: '1',
        name: 'Daredevil',
        image:
          'http://i.annihil.us/u/prod/marvel/i/mg/6/90/537ba6d49472b/' +
          'standard_xlarge.jpg',
        profile: { str: 2, int: 7, agi: 9, luk: 7 },
      });
  });
});

describe('error handling', () => {
  test('negotiation failed', async () => {
    await request(createAppCallback())
      .get('/heroes')
      .set('Accept', 'text/xml')
      .expect(406);
  });

  test('unsupported method', async () => {
    await request(createAppCallback())
      .delete('/heroes')
      .set('Accept', 'application/json')
      .expect(405);
  });

  test('not found', async () => {
    await request(createAppCallback()).get('/').expect(404);
  });

  test('Hahow API error: non-200 status', async () => {
    fetch.mockResponseOnce('', { status: 500 });
    await request(createAppCallback())
      .get('/heroes')
      .set('Accept', 'application/json')
      .expect(502);
  });

  test('Hahow API error: non-json response', async () => {
    fetch.mockResponseOnce('', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
    await request(createAppCallback())
      .get('/heroes')
      .set('Accept', 'application/json')
      .expect(502);
  });

  test('Hahow API error: invalid json', async () => {
    fetch.mockResponseOnce('{', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    await request(createAppCallback())
      .get('/heroes')
      .set('Accept', 'application/json')
      .expect(502);
  });

  test('Hahow API error: schema validation failed', async () => {
    fetch.mockResponseOnce('{"foo": "bar"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    await request(createAppCallback())
      .get('/heroes')
      .set('Accept', 'application/json')
      .expect(502);
  });
});
