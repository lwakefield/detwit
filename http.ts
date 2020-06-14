import { ServerRequest, Response } from 'https://deno.land/std/http/server.ts';
import { Cookies } from 'https://deno.land/std/http/cookie.ts';
import { MultipartReader } from 'https://deno.land/std/mime/multipart.ts';

import { multiParser } from 'https://deno.land/x/multiparser/mod.ts';

import { sql, query } from './db.ts';

export const redirect = (location : string, status = 301) => {
    return {
        status,
        headers: new Headers({
            location,
        }),
    }
};

export const redirectBack = (req : Request) => {
    return redirect(req.headers.get('referer') || '');
};

export const redirectBackOrOkay = (req : Request) => {
  const ref = req.headers.get('referer');
  if (ref) return redirect(ref!);

  return { status: 200 };
};

export const auth =  async (req : Request) => {
  const cookies = getCookies(req);

  if (!cookies.tok) { return null; }

  const [ user ] = await query(
      sql`select "userId", "username", "displayName" from "sessionTokens"
      left join "users" using ("userId")
      where "token" = ${cookies.tok} and "expiresAt" > current_timestamp`,
  );

  return user || null;
};

export const assertAuth =  async (req : Request) => {
    const user = await auth(req);

    if (!user) { throw new Error('Not authenticated'); }

    return user;
};

export const getUrl = (req : Request) => {
    return new URL(`http://${req.headers.get('host') as string}${req.url}`);
}

export function getCookies(req: Request): Cookies {
  const cookie = req.headers.get("Cookie");
  if (cookie != null) {
    const out: Cookies = {};
    const c = cookie.split(";");
    for (const kv of c) {
      const [cookieKey, ...cookieVal] = kv.split("=");
      // assert(cookieKey != null);
      const key = cookieKey.trim();
      out[key] = cookieVal.join("=");
    }
    return out;
  }
  return {};
}
