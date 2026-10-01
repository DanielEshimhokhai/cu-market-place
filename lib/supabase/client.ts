"use client";

import { createBrowserClient as create } from "@supabase/ssr";

let client: ReturnType<typeof create> | undefined;

export const createBrowserClient = () =>
  (client ??= create(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!));
