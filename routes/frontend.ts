import { ServerRequest } from 'https://deno.land/std/http/server.ts';

import { renderFile } from 'https://deno.land/x/dejs/mod.ts';

import { auth, getUrl as getURL } from '../http.ts';
import { query } from '../db.ts';

const POST_QUERY_SELECT_PART = `
        select
          posts.*,
          json_build_object(
            'displayName', "users"."displayName",
            'username', "users"."username"
          ) as "author",
          "reactionCounts",
          coalesce("apiPostsUserReactions"."counts", '{}'::json) as "myReactions"
        from "posts"
        left join "users" using ("userId")
        left join "apiPostsAllReactions" using ("postId")
        left join "apiPostsUserReactions"
          on "apiPostsUserReactions"."userId" = $1
          and "apiPostsUserReactions"."postId" = "posts"."postId"
`;

export const index = async (req : ServerRequest) => {
  const user = await auth(req);

  const url = getURL(req);
  const before = url.searchParams.get('before') || 'infinity';
  const after = url.searchParams.get('after') || '-infinity';

  let posts: {}[] = [];

  if (user) {
    posts = await query(
      `
        ${POST_QUERY_SELECT_PART}
        where
          (
            "posts"."userId" = $2
            or "posts"."userId" in (
              select "followingUserId" from "following"
              where "userId" = $3
            )
          ) and "posts"."createdAt" < $4 and "posts"."createdAt" > $5
        order by "createdAt" desc
        limit 50
      `,
      user.userId, user.userId, user.userId, before, after
    )
  } else {
    posts = await query(
      `
        ${POST_QUERY_SELECT_PART}
        order by "createdAt" desc
        limit 50
      `,
      null
    )
  }

  return {
    body: await renderFile(`routes/frontend/index.ejs`, { posts, currentUser: user })
  };
};

export const signup = async (req : ServerRequest) => {
  return {
    body: await renderFile(`routes/frontend/signup.ejs`, { })
  };
};

export const signin = async (req : ServerRequest) => {
  return {
    body: await renderFile(`routes/frontend/signin.ejs`, { })
  };
};

export const user = async (req : ServerRequest) => {
  const [ , username ] = req.url.match(/\/u\/(\w+)/) || [];

  if (!username) { return { status: 404 } }

  const url = getURL(req);
  const before = url.searchParams.get('before') || 'infinity';
  const after = url.searchParams.get('after') || '-infinity';

  const me = await auth(req);

  const userQuery = query(`
                          select
                            "users"."userId",
                            "username",
                            "displayName",
                            "followingId" is not null as "isFollowing"
                          from "users"
                          left join "following" on
                            "following"."followingUserId" = "users"."userId"
                            and "following"."userId" = $1
                          where "username" = $2`, me?.userId, username);

  const postsQuery = query(
      `
      ${POST_QUERY_SELECT_PART}
      where "username" = $2 and "posts"."createdAt" < $3 and "posts"."createdAt" > $4
      order by "createdAt" desc
      limit 50
      `,
      me?.userId, username, before, after
    );


  const [ [ user ], posts ] = await Promise.all([ userQuery, postsQuery ]);

  return {
    body: await renderFile(`routes/frontend/user.ejs`, { user, posts, currentUser: me })
  };
};

export const userFeed = async (req : ServerRequest) => {
  const [ , username ] = req.url.match(/\/u\/(\w+)/) || [];

  if (!username) { return { status: 404 } }

  const url = getURL(req);
  const before = url.searchParams.get('before') || 'infinity';
  const after = url.searchParams.get('after') || '-infinity';

  const me = await auth(req);

  const userQuery = query(`
                          select
                            "users"."userId",
                            "username",
                            "displayName",
                            "followingId" is not null as "isFollowing"
                          from "users"
                          left join "following" on
                            "following"."followingUserId" = "users"."userId"
                            and "following"."userId" = $1
                          where "username" = $2`, me?.userId, username);

  const postsQuery = query(
      `
      ${POST_QUERY_SELECT_PART}
      where
          (
            "posts"."userId" = (select "userId" from "users" where "username" = $2)
            or "posts"."userId" in (
              select "followingUserId" from "following"
              where "userId" = (select "userId" from "users" where "username" = $3)
            )
          ) and "posts"."createdAt" < $4 and "posts"."createdAt" > $5
      order by "createdAt" desc
      limit 50
      `,
      me?.userId, username, username, before, after
    );


  const [ [ user ], posts ] = await Promise.all([ userQuery, postsQuery ]);

  return {
    body: await renderFile(`routes/frontend/user-feed.ejs`, { user, posts, currentUser: me })
  };
};
