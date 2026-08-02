'server-only';
'use server';

import { revalidatePath } from 'next/cache';

export async function refetchData(path: string) {
  // Executes on the Next.js server
  revalidatePath(path);
}
