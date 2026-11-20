import { describe, expect, it } from "vitest";
import { clearLoginFailures, loginAllowed, recordLoginFailure } from "../lib/auth-core";
import { hashPassword, verifyPassword } from "../lib/password";
import { formatMXN, parsePriceToCents } from "../lib/money";
import { cartSchema, loginSchema, productSchema, registerSchema } from "../lib/validation";

describe("contraseñas", () => {
  it("verifica la correcta y rechaza la incorrecta", () => {
    const h = hashPassword("secreto123");
    expect(h).not.toContain("secreto123");
    expect(verifyPassword("secreto123", h)).toBe(true);
    expect(verifyPassword("otra", h)).toBe(false);
    expect(verifyPassword("x", "basura")).toBe(false);
  });

  it("cada hash usa una sal distinta", () => {
    expect(hashPassword("igual")).not.toBe(hashPassword("igual"));
  });
});

describe("límite de intentos", () => {
  it("bloquea tras demasiados fallos y se reinicia", () => {
    const key = "x@tec.mx";
    clearLoginFailures(key);
    for (let i = 0; i < 8; i++) recordLoginFailure(key, 1000);
    expect(loginAllowed(key, 2000)).toBe(false);
    expect(loginAllowed(key, 1000 + 11 * 60 * 1000)).toBe(true);
    clearLoginFailures(key);
    expect(loginAllowed(key, 2000)).toBe(true);
  });
});

describe("validación", () => {
  it("valida registro, login y carrito", () => {
    expect(registerSchema.safeParse({ name: "A", email: "x", password: "1" }).success).toBe(false);
    expect(loginSchema.parse({ email: " A@B.com ", password: "x" }).email).toBe("a@b.com");
    expect(cartSchema.safeParse([]).success).toBe(false);
    expect(cartSchema.safeParse([{ productId: 1, quantity: 0 }]).success).toBe(false);
    expect(cartSchema.safeParse([{ productId: 1, quantity: 2 }]).success).toBe(true);
  });

  it("valida productos (stock vacío = ilimitado)", () => {
    const base = { name: "Café", description: "", categoryId: "1", emoji: "☕" };
    expect(productSchema.parse({ ...base, stock: "" }).stock).toBeNull();
    expect(productSchema.parse({ ...base, stock: "12" }).stock).toBe(12);
    expect(productSchema.safeParse({ ...base, stock: "-3" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, stock: "1.5" }).success).toBe(false);
  });
});

describe("dinero", () => {
  it("formatea y parsea precios", () => {
    expect(formatMXN(3550)).toContain("35.50");
    expect(parsePriceToCents("35,5")).toBe(3550);
    expect(parsePriceToCents("abc")).toBeNull();
    expect(parsePriceToCents("-1")).toBeNull();
  });
});
