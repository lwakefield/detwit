import { ServerRequest } from 'https://deno.land/std/http/server.ts';

import { renderFile } from 'https://deno.land/x/dejs/mod.ts';

import { auth, getUrl as getURL } from '../http.ts';
import { query, sql } from '../db.ts';

import * as queries from './frontend/queries.ts';

export const index = async (req : Request) => {
  const user = await auth(req);

  const url = getURL(req);
  const before = url.searchParams.get('before') || 'infinity';
  const after = url.searchParams.get('after') || '-infinity';

const q = queries.allPosts(
    user?.userId || null,
    before,
    after
  )
  let posts: {}[] = await query(q);

  return {
    body: await renderFile(`routes/frontend/index.ejs`, { posts, currentUser: user })
  };
};

export const all = index;

export const signup = async (req : Request) => {
  return {
    body: await renderFile(`routes/frontend/signup.ejs`, { })
  };
};

export const signin = async (req : Request) => {
  return {
    body: await renderFile(`routes/frontend/signin.ejs`, { })
  };
};

export const user = async (req : Request) => {
  const [ , username ] = req.url.match(/\/u\/(\w+)/) || [];

  if (!username) { return { status: 404 } }

  const url = getURL(req);
  const before = url.searchParams.get('before') || 'infinity';
  const after = url.searchParams.get('after') || '-infinity';

  const me = await auth(req);

  const userQuery = query(queries.user(me?.userId, username));

  const postsQuery = query(queries.userPosts(me?.userId, username, before, after));

  const [ [ user ], posts ] = await Promise.all([ userQuery, postsQuery ]);

  return {
    body: await renderFile(`routes/frontend/user.ejs`, { user, posts, currentUser: me })
  };
};

export const userFeed = async (req : Request) => {
  const [ , username ] = req.url.match(/\/u\/(\w+)/) || [];

  if (!username) { return { status: 404 } }

  const url = getURL(req);
  const before = url.searchParams.get('before') || 'infinity';
  const after = url.searchParams.get('after') || '-infinity';

  const me = await auth(req);

  const userQuery = query(queries.user(me?.userId, username));

  // TODO
const q = queries.feed(sql`
    (select "userId" from "users" where "username"=${username})
  `, me?.userId || null)
  const feedQuery = query(q);
  console.log(q.toSQL().sql);
  const postsQuery = query(queries.allPosts(
    me?.userId,
    before,
    after,
    sql`"posts"."userId" = (select "userId" from "users" where "username" = ${username})
        or "posts"."userId" in (
          select "followingUserId" from "following"
          where "userId" = (select "userId" from "users" where "username" = ${username})
        )`
  ));


  const [ [ user ], posts, feed ] = await Promise.all([
    userQuery,
    postsQuery,
    feedQuery
  ]);

  return {
    body: await renderFile(`routes/frontend/user-feed.ejs`, { user, posts, feed, currentUser: me })
  };
};
