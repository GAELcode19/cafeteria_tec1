import { expect, test, type Page } from "@playwright/test";

const email = `alumno${Date.now()}@tec.mx`;
const password = "contraseña-segura-1";

async function login(page: Page, mail: string, pass: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(mail);
  await page.getByLabel("Contraseña").fill(pass);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("flujo completo: pedir, preparar y recoger", async ({ page, browser }) => {
  // menu y carrito
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Café americano" })).toBeVisible();
  const cafe = page.locator("li", { hasText: "Café americano" });
  await cafe.getByRole("button", { name: "Agregar" }).click();
  await cafe.getByRole("button", { name: /Agregar|Agregado/ }).click();
  await page.locator("li", { hasText: "Torta de jamón" }).getByRole("button", { name: "Agregar" }).click();

  await page.goto("/carrito");
  await expect(page.getByText("Café americano")).toBeVisible();
  await expect(page.getByText("$105.00")).toBeVisible(); // 2 x 25 + 55

  // sin sesion manda a login
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // registro
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Ana Prueba");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("link", { name: "Mis pedidos" })).toBeVisible();

  // el carrito sigue despues del registro, se confirma el pedido
  await page.goto("/carrito");
  await page.getByLabel("Notas para la cafetería (opcional)").fill("Sin azúcar");
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page).toHaveURL(/\/pedidos\/\d+\?nuevo=1/);
  await expect(page.getByText("¡Pedido recibido!")).toBeVisible();
  await expect(page.getByText("Pendiente")).toBeVisible();
  const orderUrl = page.url().split("?")[0];

  // carrito vacio
  await page.goto("/carrito");
  await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();

  // un alumno no entra al panel
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);

  // staff ve el pedido y lo avanza
  const staff = await (await browser.newContext()).newPage();
  await login(staff, "admin@cafeteria.local", "e2e-admin-123");
  await expect(staff).toHaveURL(/\/admin$/);
  await expect(staff.getByText("Sin azúcar")).toBeVisible();
  await staff.getByRole("button", { name: "Marcar: Preparando" }).first().click();
  await staff.getByRole("button", { name: "Marcar: ¡Listo para recoger!" }).first().click();

  // el alumno lo ve listo
  await page.goto(orderUrl);
  await expect(page.getByText("¡Listo para recoger!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar pedido" })).toHaveCount(0);

  // se entrega y sale en el reporte
  await staff.reload();
  await staff.getByRole("button", { name: "Marcar: Entregado" }).first().click();
  await staff.goto("/admin/reportes");
  await expect(staff.getByText("Café americano")).toBeVisible();
});

test("credenciales incorrectas muestran error", async ({ page }) => {
  await login(page, "nadie@tec.mx", "incorrecta123");
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
});

test("un alumno no ve pedidos de otros", async ({ page }) => {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Otro Alumno");
  await page.getByLabel("Correo").fill(`otro${Date.now()}@tec.mx`);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("link", { name: "Mis pedidos" })).toBeVisible();
  await page.goto("/pedidos/1");
  await expect(page.getByText("No encontramos esa página")).toBeVisible();
});
