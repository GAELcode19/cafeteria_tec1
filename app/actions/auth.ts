"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  authenticate,
  AuthError,
  clearLoginFailures,
  loginAllowed,
  recordLoginFailure,
  registerUser,
} from "@/lib/auth-core";
import { endSession, startSession } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validation";

export type FormState = { error?: string } | undefined;

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  if (!loginAllowed(email)) return { error: "Demasiados intentos. Espera unos minutos." };
  const user = await authenticate(await getDb(), email, password);
  if (!user) {
    recordLoginFailure(email);
    return { error: "Correo o contraseña incorrectos." };
  }
  clearLoginFailures(email);
  await startSession(user.id);
  redirect(user.role === "student" ? "/" : "/admin");
}

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let userId: number;
  try {
    userId = await registerUser(await getDb(), parsed.data);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  await startSession(userId);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
