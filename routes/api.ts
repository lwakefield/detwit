import { ServerRequest, Response } from 'https://deno.land/std/http/server.ts';
import { setCookie, deleteCookie } from 'https://deno.land/std/http/cookie.ts';

import { getCookies, redirectBackOrOkay, redirect, assertAuth } from '../http.ts';
import { sql, query } from '../db.ts';

export const ping = async (req : Request) => {
  return { status: 200, body: 'pong' };
}

export const createUser = async (req : Request) => {
  const data = await req.formData();

  await query(
    sql`insert into "users" ("username", "passwordHash")
    values (
      ${data.get('username')},
      crypt(${data.get('password')}, gen_salt('bf'))
    )`,
  );

  return redirectBackOrOkay(req);
}

export const createSession = async (req : Request) => {
  const data = await req.formData();

  const [ authRow ] = await query(
    sql`select "userId" from "users"
    where
      "username" = ${data.get('username')}
      and "passwordHash" = crypt(${data.get('password')}, "passwordHash")`,
  );

  if (!authRow) {
    return { status: 401 };
  }

  const [ tokenRow ] = await query(
    sql`insert into "sessionTokens" ("userId")
    values (${authRow.userId})
    returning "token", "expiresAt"`,
  );

  const response = req.headers.get('referer')
    ? redirect('/')
    : { status: 200 };
  setCookie(response, {
    name: 'tok',
    value: tokenRow.token,
    expires: tokenRow.expiresAt,
    path: '/'
  });

  return response;
}

export const deleteSession = async (req : Request) => {
  const cookies = getCookies(req);

  await query(
      sql`delete from "sessionTokens"
      where "token" = ${cookies.tok}`
  );

  const response = req.headers.get('referer')
    ? redirect('/')
    : { status: 200 };
  deleteCookie(response, 'tok');

  return response;
};

export const createPost = async (req : Request) => {
  const user = await assertAuth(req);
  const data = await req.formData();

  await query(
    sql`insert into "posts" ("userId", "content")
    values (${user.userId}, ${data.get('content')})`,
  );


  return redirectBackOrOkay(req);
};

export const createFollow = async (req : Request) => {
  const user = await assertAuth(req);
  const data = await req.formData();

  await query(
    sql`insert into "following" ("userId", "followingUserId")
    values (${user.userId}, ${data.get('userId')})`,
  );

  return redirectBackOrOkay(req);
};

export const deleteFollow = async (req : Request) => {
  const user = await assertAuth(req);
  const data = await req.formData();

  await query(
    sql`delete from "following"
    where "userId" = ${user.userId}
      and "followingUserId" = ${data.get('userId')}`,
  );

  return redirectBackOrOkay(req);
};

export const createPostReaction = async (req : Request) => {
  const user = await assertAuth(req);
  const data = await req.formData();

  await query(
    sql`insert into "postReactions" ("postId", "userId", "type")
    values (${data.get('postId')}, ${user.userId}, ${data.get('type')})`,
  );

  return redirectBackOrOkay(req);
};

export const deletePostReaction = async (req : Request) => {
  const user = await assertAuth(req);
  const data = await req.formData();

  await query(
    sql`delete from "postReactions"
    where "postId"=${data.get('postId')}
      and "userId"=${user.userId}
      and "type"=${data.get('type')}`,
  );

  return redirectBackOrOkay(req);
};
