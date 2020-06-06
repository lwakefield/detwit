import { ServerRequest, Response } from 'https://deno.land/std/http/server.ts';
import { getCookies } from 'https://deno.land/std/http/cookie.ts';

import { multiParser } from 'https://deno.land/x/multiparser/mod.ts';

import { query } from './db.ts';

export const readyBody = async (req : ServerRequest) => {
  const buf: Uint8Array = await Deno.readAll(req.body);
  const decoded = new TextDecoder("utf-8").decode(buf);
  return decoded;
};

export const readFormData = async (req : ServerRequest) => {
    const form = await multiParser(req);
    return form;
};

export const redirect = (location : string, status = 301) => {
    return {
        status,
        headers: new Headers({
            location,
        }),
    }
};

export const redirectBack = (req : ServerRequest) => {
    return redirect(req.headers.get('referer') || '');
};

export const auth =  async (req : ServerRequest) => {
  const cookies = getCookies(req);

  if (!cookies.tok) { return null; }

  const [ user ] = await query(
      `select "userId", "username", "displayName" from "sessionTokens"
      left join "users" using ("userId")
      where "token" = $1 and "expiresAt" > current_timestamp`,
      cookies.tok
  );

  return user || null;
};

export const assertAuth =  async (req : ServerRequest) => {
    const user = await auth(req);

    if (!user) { throw new Error('Not authenticated'); }

    return user;
};

export const getUrl = (req : ServerRequest) => {
    return new URL(`http://${req.headers.get('host') as string}${req.url}`);
}
