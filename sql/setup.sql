-- ============================================================
-- Preparación de MySQL para Cafetería Tec
-- Ejecútalo UNA vez en MySQL Workbench, conectado como administrador
-- (root) a "Local instance MySQL97" (puerto 3306).
--
-- Crea bases NUEVAS y un usuario propio. No toca tus otros esquemas
-- (control_negodo, nutrifast, etc.).
-- ============================================================

-- 1) Bases de datos
CREATE DATABASE IF NOT EXISTS cafeteria_tec  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;  -- la app
CREATE DATABASE IF NOT EXISTS cafeteria_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;  -- pruebas unitarias (se vacía en cada corrida)
CREATE DATABASE IF NOT EXISTS cafeteria_e2e  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;  -- pruebas E2E (se vacía en cada corrida)

-- 2) Usuario de la aplicación  >>> CAMBIA la contraseña antes de ejecutar <<<
CREATE USER IF NOT EXISTS 'cafeteria'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CONTRASENA';

-- 3) Permisos solo sobre bases cuyo nombre empiece con "cafeteria_"
GRANT ALL PRIVILEGES ON `cafeteria\_%`.* TO 'cafeteria'@'localhost';
FLUSH PRIVILEGES;

-- Las tablas las crea la app sola al primer arranque (ver lib/sql.ts).
-- Después, en .env.local:
--   DB_USER=cafeteria
--   DB_PASSWORD=<la contraseña que elegiste>
