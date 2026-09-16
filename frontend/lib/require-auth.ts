import { NextResponse } from "next/server"
import { createClient } from "./supabase/server"

export async function requireAuth() {
  const {
    data: { user },
    error,
  } = await (await createClient()).auth.getUser()
  if (error || !user)
    return {
      error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    }
  return { user }
}
