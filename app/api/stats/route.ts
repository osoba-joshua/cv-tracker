import { connection } from "next/server";
import { coreStats } from "@/lib/core";

// GET -> live numbers for the landing page. Uses the same hourly feed cache as searches.
export async function GET() {
  await connection(); // never prerender: this needs live network access
  return Response.json(await coreStats());
}
