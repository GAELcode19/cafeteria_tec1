import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "./db";
import { createSession, deleteSession, getUserByToken, SESSION_DAYS, type SessionUser } from "./auth-core";
import type { Role } from "./validation";

const COOKIE = "cafeteria_session";

// usuario de la sesion actual, llamar dentro de un Suspense
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  // usa la hora y la bd, no puede correr en el prerender
  await connection();
  return getUserByToken(await getDb(), token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export async function startSession(userId: number): Promise<void> {
  const { token, expires } = await createSession(await getDb(), userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    expires,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await deleteSession(await getDb(), token);
  store.delete(COOKIE);
}
