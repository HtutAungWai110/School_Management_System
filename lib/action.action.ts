'server-only';
'use server';

import { revalidatePath } from 'next/cache';

export async function refetchData(paths: string | string[]) {
  // Executes on the Next.js server
  const list = Array.isArray(paths) ? paths : [paths];
  for (const path of list) {
    revalidatePath(path);
  }
}
