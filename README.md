# Cafetería Tec

Sistema de pedidos para la cafetería: los alumnos arman su pedido desde el celular, pagan en caja al recoger y siguen el estado en tiempo casi real. El personal gestiona pedidos, inventario y reportes desde un panel.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · Tailwind 4 · MySQL 9.7 (`mysql2`) · Zod · Vitest · Playwright.

## Requisitos

- Node.js 20 o superior.
- MySQL 8 o 9 corriendo en local (probado con **9.7.1**, puerto 3306).

## Inicio rápido

1. **Prepara MySQL (una sola vez).** Abre [sql/setup.sql](sql/setup.sql) en MySQL Workbench, conectado a tu instancia `MySQL97` como `root`. Cambia `CAMBIA_ESTA_CONTRASENA` por una contraseña tuya y ejecútalo. Crea las bases `cafeteria_tec`, `cafeteria_test` y `cafeteria_e2e` y el usuario `cafeteria`, sin tocar tus otros esquemas.
2. **Configura la conexión.** Copia `.env.example` a `.env.local` y pon en `DB_PASSWORD` la contraseña del paso anterior.
3. **Arranca:**

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. Las tablas y un menú de ejemplo se crean solos en el primer arranque. Si la conexión falla, la app dice qué variable revisar.

El administrador inicial se crea con `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Si no defines `ADMIN_PASSWORD`, en desarrollo se usa `admin1234`; **en producción es obligatorio y debe tener 8+ caracteres**.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DB_HOST`, `DB_PORT` | Servidor MySQL (por defecto `127.0.0.1:3306`). |
| `DB_USER`, `DB_PASSWORD` | Usuario y contraseña de la app. |
| `DB_NAME` | Base de la app (por defecto `cafeteria_tec`). |
| `DB_TEST_NAME` | Base de pruebas unitarias (por defecto `cafeteria_test`). **Se vacía en cada corrida**; si su nombre no contiene `test` o `e2e`, las pruebas se niegan a correr. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Administrador inicial. |
| `ALLOWED_EMAIL_DOMAIN` | Si se define (ej. `tec.mx`), solo se permite registro con ese dominio. |
## Roles

- **Alumno** (`student`): ve el menú, hace y cancela (mientras esté pendiente) sus pedidos.
- **Personal** (`staff`): tablero de pedidos, ocultar productos y ajustar stock.
- **Admin** (`admin`): todo lo anterior, más crear/editar productos, reportes de ventas y gestión de roles.

Todo registro nuevo es alumno; solo un admin puede promover a otros desde **Admin → Usuarios**.

## Flujo de un pedido

`pendiente → preparando → listo → entregado` (o `cancelado` en cualquier punto antes de entregar). Al crear un pedido se descuenta el stock y al cancelarlo se devuelve. Los precios siempre se leen de la base de datos; del navegador solo se aceptan ids y cantidades.

## Rutas

| Ruta | Acceso |
|---|---|
| `/` | Público: menú |
| `/carrito`, `/login`, `/registro` | Público |
| `/pedidos`, `/pedidos/[id]` | Sesión (dueño del pedido o personal) |
| `/admin`, `/admin/productos` | Personal / admin |
| `/admin/reportes`, `/admin/usuarios` | Admin |
| `GET /api/menu` | Público: menú en JSON |
| `GET /api/health` | Estado del servicio y la base de datos |

## Pruebas

```bash
npm run test       # unitarias (Vitest) contra MySQL: pedidos, stock, concurrencia, sesiones
npm run test:e2e   # E2E (Playwright con Microsoft Edge): pedir → preparar → recoger
npm run lint
npm run typecheck
```

Las E2E usan la base `cafeteria_e2e` (se vacía antes de cada corrida) y el Edge instalado en el sistema; no descargan navegadores.

## Estructura

```
app/            Rutas, páginas y server actions (app/actions)
components/     Componentes de interfaz
lib/            Lógica de negocio (sql, db, orders, auth-core, menu, validación)
sql/            Script de preparación de MySQL (setup.sql)
tests/          Pruebas unitarias
e2e/            Pruebas de extremo a extremo
```

La lógica de `lib/` recibe la conexión como parámetro, por eso se prueba directamente contra una base de pruebas.

## Notas de diseño

- **Cache Components:** todo acceso a sesión o base de datos ocurre dentro de `<Suspense>` y tras `connection()`, para que nunca se congele en el HTML estático.
- **Concurrencia:** los pedidos usan transacciones con bloqueo de fila (`SELECT … FOR UPDATE`), así que dos clientes no pueden comprar la última pieza a la vez.
- **Seguridad:** contraseñas con scrypt, sesiones con token aleatorio (se guarda solo su hash SHA-256), cookie `httpOnly`/`sameSite=lax`, límite de intentos de login, y verificación de rol dentro de cada server action.

## Pendientes conocidos

- **Pagos en línea:** hoy el pago es en caja. Integrar Stripe o Mercado Pago requiere una cuenta del comercio.
- **Despliegue:** necesita un MySQL accesible desde el servidor (PlanetScale, Railway, un VPS, etc.) y definir las variables `DB_*`. Con un MySQL en la nube, revisa si exige conexión TLS.
- El límite de intentos de login es en memoria (se reinicia al reiniciar el servidor y no se comparte entre instancias).
- No hay recuperación de contraseña ni notificaciones push/correo.
