import { connection } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  await connection();
  try {
    await (await getDb()).query("SELECT 1");
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
