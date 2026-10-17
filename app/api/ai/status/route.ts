import { connection } from "next/server";
import { aiStatus } from "@/lib/ai";

// GET -> { enabled, providers } so the UI knows whether to show the AI tools.
export async function GET() {
  await connection(); // read env at request time, not build time
  return Response.json(aiStatus());
}
