import { cookies } from "next/headers";

export async function serverFetch(url: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (options) {
    options.headers = {
      ...(options.headers ?? {}),
      Cookie: cookieHeader,
    };
  } else {
    options = {
      headers: {
        Cookie: cookieHeader,
      },
    };
  }

  return fetch(url, options);
}
