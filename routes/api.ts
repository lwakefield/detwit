import { ServerRequest, Response } from 'https://deno.land/std/http/server.ts';
import { setCookie, getCookies, delCookie } from 'https://deno.land/std/http/cookie.ts';

import { readFormData, redirectBack, redirect, assertAuth } from '../http.ts';
import { query } from '../db.ts';

export const ping = async (req : ServerRequest) => {
  return { status: 200, body: 'pong' };
}

export const createUser = async (req : ServerRequest) => {
  const data = await readFormData(req);

  await query(
    `insert into "users" ("username", "passwordHash")
    values ($1, crypt($2, gen_salt('bf')))`,
    data?.username, data?.password
  );

  return redirectBack(req);
}

export const createSession = async (req : ServerRequest) => {
  const data = await readFormData(req);

  const [ authRow ] = await query(
    `select "userId" from "users"
    where
      "username" = $1
      and "passwordHash" = crypt($2, "passwordHash")`,
    data?.username, data?.password
  );

  if (!authRow) {
    return { status: 401 };
  }

  const [ tokenRow ] = await query(
    `insert into "sessionTokens" ("userId")
    values ($1)
    returning "token", "expiresAt"`,
    authRow.userId
  );

  const response = redirect('/');
  setCookie(response, {
    name: 'tok',
    value: tokenRow.token,
    expires: tokenRow.expiresAt,
    path: '/'
  });

  return response;
}

export const deleteSession = async (req : ServerRequest) => {
  const cookies = getCookies(req);

  await query(
      `delete from "sessionTokens"
      where "token" = $1`, cookies.tok
  );

  const response = redirect('/');
  delCookie(response, 'tok');

  return response;
};

export const createPost = async (req : ServerRequest) => {
  const user = await assertAuth(req);
  const data = await readFormData(req);

  await query(
    `insert into "posts" ("userId", "content") values ($1, $2)`,
    user.userId, data?.content
  );


  return redirectBack(req);
};

export const createFollow = async (req : ServerRequest) => {
  const user = await assertAuth(req);
  const data = await readFormData(req);

  await query(
    `insert into "following" ("userId", "followingUserId") values ($1, $2)`,
    user.userId, data?.userId
  );

  return redirectBack(req);
};

export const deleteFollow = async (req : ServerRequest) => {
  const user = await assertAuth(req);
  const data = await readFormData(req);

  await query(
    `delete from "following" where "userId" = $1 and "followingUserId" = $2`,
    user.userId, data?.userId
  );

  return redirectBack(req);
};

export const createPostReaction = async (req : ServerRequest) => {
  const user = await assertAuth(req);
  const data = await readFormData(req);

  await query(
    `insert into "postReactions" ("postId", "userId", "type")
    values ($1, $2, $3)`,
    data?.postId, user.userId, data?.type
  );

  return redirectBack(req);
};

export const deletePostReaction = async (req : ServerRequest) => {
  const user = await assertAuth(req);
  const data = await readFormData(req);

  await query(
    `delete from "postReactions" where "postId"=$1 and "userId"=$2 and "type"=$3`,
    data?.postId, user.userId, data?.type
  );

  return redirectBack(req);
};
