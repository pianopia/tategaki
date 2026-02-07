import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'tategaki_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type SessionPayload = {
  loginId: string;
  exp: number;
};

const getSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET が設定されていません');
  }
  return secret;
};

const sign = (payload: string) => {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
};

const encode = (payload: SessionPayload) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

const decode = (value: string): SessionPayload | null => {
  const [encodedPayload, signature] = value.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  if (signature !== expected) return null;

  try {
    const json = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as SessionPayload;
    if (!parsed.exp || parsed.exp <= Date.now()) return null;
    if (!parsed.loginId) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const isAdminCredentialValid = (loginId: string, password: string) => {
  const expectedId = process.env.ADMIN_LOGIN_ID;
  const expectedPassword = process.env.ADMIN_LOGIN_PASSWORD;
  if (!expectedId || !expectedPassword) {
    throw new Error('ADMIN_LOGIN_ID または ADMIN_LOGIN_PASSWORD が設定されていません');
  }

  return loginId === expectedId && password === expectedPassword;
};

export const createAdminSession = async (loginId: string) => {
  const cookieStore = await cookies();
  const exp = Date.now() + SESSION_TTL_MS;

  cookieStore.set(COOKIE_NAME, encode({ loginId, exp }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(exp),
  });
};

export const destroyAdminSession = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
};

export const getAdminSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = decode(token);
  if (!payload) {
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  return payload;
};

export const requireAdmin = async () => {
  const session = await getAdminSession();
  if (!session) redirect('/login');
  return session;
};
