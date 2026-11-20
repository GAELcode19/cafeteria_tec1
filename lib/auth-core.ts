import { createHash, randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "./password";
import { one, run, type Db } from "./sql";
import type { Role } from "./validation";

export class AuthError extends Error {}

export type SessionUser = { id: number; name: string; email: string; role: Role };

export const SESSION_DAYS = 14;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function registerUser(
  db: Db,
  input: { name: string; email: string; password: string },
  allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN,
): Promise<number> {
  const email = input.email.toLowerCase();
  if (allowedDomain && !email.endsWith(`@${allowedDomain.toLowerCase()}`)) {
    throw new AuthError(`Usa tu correo institucional (@${allowedDomain}).`);
  }
  try {
    const { insertId } = await run(
      db,
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')",
      [input.name, email, hashPassword(input.password)],
    );
    return insertId;
  } catch (e) {
    // el indice unico atrapa registros simultaneos
    if ((e as { code?: string }).code === "ER_DUP_ENTRY") throw new AuthError("Ese correo ya está registrado.");
    throw e;
  }
}

// hash falso para que el tiempo de respuesta no delate si el correo existe
const DUMMY_HASH = hashPassword("dummy-password");

export async function authenticate(db: Db, email: string, password: string): Promise<SessionUser | null> {
  const row = await one<SessionUser & { password_hash: string }>(
    db,
    "SELECT id, name, email, role, password_hash FROM users WHERE email = ?",
    [email.toLowerCase()],
  );
  const ok = verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function createSession(db: Db, userId: number, now = Date.now()) {
  const token = randomBytes(32).toString("hex");
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await run(db, "DELETE FROM sessions WHERE expires_at < ?", [now]);
  await run(db, "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [
    sha256(token),
    userId,
    expires,
  ]);
  return { token, expires };
}

export async function getUserByToken(db: Db, token: string, now = Date.now()): Promise<SessionUser | null> {
  const user = await one<SessionUser>(
    db,
    `SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [sha256(token), now],
  );
  return user ?? null;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await run(db, "DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
}

// intentos de login fallidos por correo, en memoria
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function loginAllowed(key: string, now = Date.now()): boolean {
  const a = attempts.get(key);
  if (!a || now - a.first > WINDOW_MS) return true;
  return a.count < MAX_ATTEMPTS;
}
export function recordLoginFailure(key: string, now = Date.now()): void {
  const a = attempts.get(key);
  if (!a || now - a.first > WINDOW_MS) attempts.set(key, { count: 1, first: now });
  else a.count++;
}
export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
