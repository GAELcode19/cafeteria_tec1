import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { all } from "@/lib/sql";
import { setRoleAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Usuarios" };

type UserRow = { id: number; name: string; email: string; role: string };

export default function UsersPage() {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Usuarios</h1>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Users />
      </Suspense>
    </main>
  );
}

async function Users() {
  const me = await requireRole("admin");
  const users = await all<UserRow>(
    await getDb(),
    "SELECT id, name, email, role FROM users ORDER BY id DESC LIMIT 200",
  );
  return (
    <ul className="grid gap-2">
      {users.map((u) => (
        <li key={u.id} className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{u.name}</p>
            <p className="text-sm text-muted">{u.email}</p>
          </div>
          {u.id === me.id ? (
            <span className="text-sm text-muted">Tú · {u.role}</span>
          ) : (
            <form action={setRoleAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={u.id} />
              <label htmlFor={`role-${u.id}`} className="sr-only">Rol de {u.name}</label>
              <select id={`role-${u.id}`} name="role" defaultValue={u.role} className="input !w-auto">
                <option value="student">Alumno</option>
                <option value="staff">Personal</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn-ghost">Guardar</button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
