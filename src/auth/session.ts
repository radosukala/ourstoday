import { getAuth } from "./auth";

/** Fully validated server session - a cookie existing is NOT authorization. */
export interface ServerSession {
  userId: string;
  sessionId: string;
  userEmail: string;
  userEmailVerified: boolean;
  userName: string;
}

/** Build forwarded headers from a Next.js Request for Better Auth calls. */
export function endpointContext(req?: Request): Headers {
  const headers = new Headers();
  if (req) {
    for (const name of ["cookie", "origin", "user-agent", "referer"]) {
      const value = req.headers.get(name);
      if (value) headers.set(name, value);
    }
  }
  return headers;
}

export async function readServerSession(headers?: Headers | null): Promise<ServerSession | null> {
  if (!headers) return null;
  const result = await getAuth().api.getSession({ headers });
  if (!result?.user || !result.session) return null;
  return {
    userId: result.user.id,
    sessionId: result.session.id,
    userEmail: result.user.email,
    userEmailVerified: result.user.emailVerified === true,
    userName: result.user.name,
  };
}
