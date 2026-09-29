import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/modules/audit/model.js';
import { User } from '../src/modules/auth/model.js';
import { Session } from '../src/modules/auth/sessionModel.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../src/modules/auth/tokens.js';
import { cookieFrom } from './helpers/agent.js';
import { startDb, stopDb } from './helpers/db.js';

const PASSWORD = 'correct-horse-battery';
let app;

beforeAll(async () => {
  await startDb();
  app = createApp();
});
afterAll(stopDb);
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Session.deleteMany({}), AuditLog.deleteMany({})]);
  await User.create({
    name: 'Shift Engineer',
    email: 'eng@site01.local',
    passwordHash: await bcrypt.hash(PASSWORD, 4),
  });
});

const login = (email = 'eng@site01.local', password = PASSWORD) =>
  request(app).post('/api/auth/login').send({ email, password });

const refreshWith = (token) =>
  request(app).post('/api/auth/refresh').set('Cookie', `${REFRESH_COOKIE}=${token}`);

describe('auth', () => {
  it('signs in, sets httpOnly strict cookies and returns the user', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('eng@site01.local');
    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/HttpOnly/);
    expect(cookies).toMatch(/SameSite=Strict/);
    expect(await AuditLog.countDocuments({ action: 'login' })).toBe(1);
  });

  it('gives the same generic error for a wrong password and an unknown email', async () => {
    const wrong = await login('eng@site01.local', 'nope-nope-nope');
    const unknown = await login('nobody@site01.local', PASSWORD);
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe('Email or password is incorrect');
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it('protects API routes and accepts the access cookie', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const res = await login();
    const access = cookieFrom(res, ACCESS_COOKIE);
    const me = await request(app).get('/api/auth/me').set('Cookie', `${ACCESS_COOKIE}=${access}`);
    expect(me.status).toBe(200);
    expect(me.body.user.name).toBe('Shift Engineer');
  });

  it('rotates the refresh token and revokes the family when an old token is reused', async () => {
    const first = cookieFrom(await login(), REFRESH_COOKIE);
    const r1 = await refreshWith(first);
    expect(r1.status).toBe(200);
    const second = cookieFrom(r1, REFRESH_COOKIE);
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    // A parallel tab presenting the old token straight away is tolerated.
    expect((await refreshWith(first)).status).toBe(200);

    // After the grace window, the old token coming back means theft: end the whole session.
    await Session.updateMany(
      { replacedBy: { $ne: null } },
      { replacedAt: new Date(Date.now() - 60_000) },
    );
    expect((await refreshWith(first)).status).toBe(401);
    expect((await refreshWith(second)).status).toBe(401);
    expect(await AuditLog.countDocuments({ action: 'refresh_reuse' })).toBe(1);
  });

  it('logs out and invalidates the refresh token', async () => {
    const res = await login();
    const refresh = cookieFrom(res, REFRESH_COOKIE);
    const out = await request(app)
      .post('/api/auth/logout')
      .set(
        'Cookie',
        `${REFRESH_COOKIE}=${refresh}; ${ACCESS_COOKIE}=${cookieFrom(res, ACCESS_COOKIE)}`,
      );
    expect(out.status).toBe(204);
    expect((await refreshWith(refresh)).status).toBe(401);
    expect(await AuditLog.countDocuments({ action: 'logout' })).toBe(1);
  });

  it('limits failed sign-ins to 5 per 15 minutes per IP and email', async () => {
    const email = 'limited@site01.local';
    for (let i = 0; i < 5; i += 1) expect((await login(email, 'wrong-password')).status).toBe(401);
    const blocked = await login(email, 'wrong-password');
    expect(blocked.status).toBe(429);
    // A different email from the same IP is not blocked.
    expect((await login()).status).toBe(200);
  });
});
