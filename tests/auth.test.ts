import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  authenticate,
  AuthError,
  createSession,
  deleteSession,
  getUserByToken,
  registerUser,
} from "../lib/auth-core";
import { one, type Pool } from "../lib/sql";
import { freshDb } from "./db-helper";

let db: Pool;
beforeEach(async () => {
  await db?.end();
  db = await freshDb({ seedData: false });
});
afterAll(async () => {
  await db?.end();
});

describe("registro y login", () => {
  it("registra, autentica y rechaza duplicados (sin importar mayúsculas)", async () => {
    await registerUser(db, { name: "Ana", email: "Ana@Tec.mx", password: "secreto123" }, undefined);
    expect((await authenticate(db, "ana@tec.mx", "secreto123"))?.role).toBe("student");
    expect(await authenticate(db, "ana@tec.mx", "mala")).toBeNull();
    expect(await authenticate(db, "nadie@tec.mx", "secreto123")).toBeNull();
    await expect(
      registerUser(db, { name: "Ana", email: "ANA@tec.mx", password: "secreto123" }, undefined),
    ).rejects.toThrow(AuthError);
  });

  it("dos registros simultáneos con el mismo correo: solo uno entra", async () => {
    const attempt = () => registerUser(db, { name: "X", email: "x@tec.mx", password: "secreto123" }, undefined);
    const results = await Promise.allSettled([attempt(), attempt(), attempt()]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results) {
      if (r.status === "rejected") expect(r.reason).toBeInstanceOf(AuthError);
    }
  });

  it("restringe por dominio si está configurado", async () => {
    await expect(
      registerUser(db, { name: "Bob", email: "bob@gmail.com", password: "secreto123" }, "tec.mx"),
    ).rejects.toThrow(AuthError);
    expect(
      await registerUser(db, { name: "Bob", email: "bob@tec.mx", password: "secreto123" }, "tec.mx"),
    ).toBeGreaterThan(0);
  });

  it("siempre registra como estudiante", async () => {
    const id = await registerUser(db, { name: "Eve", email: "eve@x.com", password: "secreto123" }, undefined);
    const row = await one<{ role: string }>(db, "SELECT role FROM users WHERE id = ?", [id]);
    expect(row!.role).toBe("student");
  });
});

describe("sesiones", () => {
  it("crea, valida, expira y borra", async () => {
    const id = await registerUser(db, { name: "Ana", email: "ana@tec.mx", password: "secreto123" }, undefined);
    const now = 1_000_000;
    const { token } = await createSession(db, id, now);
    expect((await getUserByToken(db, token, now + 1000))?.id).toBe(id);
    expect(await getUserByToken(db, token, now + 15 * 24 * 3600 * 1000)).toBeNull();
    expect(await getUserByToken(db, "token-falso", now)).toBeNull();
    await deleteSession(db, token);
    expect(await getUserByToken(db, token, now + 1000)).toBeNull();
  });

  it("no guarda el token en claro", async () => {
    const id = await registerUser(db, { name: "Ana", email: "ana@tec.mx", password: "secreto123" }, undefined);
    const { token } = await createSession(db, id);
    const row = await one<{ token_hash: string }>(db, "SELECT token_hash FROM sessions");
    expect(row!.token_hash).not.toBe(token);
    expect(row!.token_hash).toHaveLength(64);
  });

  it("borrar un usuario elimina sus sesiones (cascada)", async () => {
    const id = await registerUser(db, { name: "Ana", email: "ana@tec.mx", password: "secreto123" }, undefined);
    await createSession(db, id);
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    const row = await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM sessions");
    expect(row!.n).toBe(0);
  });
});
