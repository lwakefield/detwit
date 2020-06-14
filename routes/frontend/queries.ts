import { sql, QueryPart } from '../../db.ts';

export const feed = (userId : number | QueryPart, myUserId : number | null) => sql`
  select 
      "posts"."createdAt",
      "following"."userId",
      'post' as "type",
      postJSON("posts"."postId", ${myUserId}) as "entry"
  from "following"
  join "posts" on "posts"."userId" = "followingUserId"
  where "following"."userId" = ${userId}

  union all

  select 
      "postReactions"."createdAt",
      "following"."userId",
      'reaction' as "type",
      json_build_object(
          'post', postJSON("postReactions"."postId", ${myUserId}),
          'reactionType', "postReactions"."type",
          'actor', userJSON("postReactions"."userId")
      ) as "entry"
  from "following"
  join "postReactions" on "postReactions"."userId" = "followingUserId"
  where "following"."userId" = ${userId}

  order by "createdAt" desc
  limit 50
`;

export const allPosts = (
  userId : number | null,
  before : string,
  after : string,
  filter : QueryPart = sql`1=1`
) => sql`
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
    on "apiPostsUserReactions"."userId" = ${userId}
    and "apiPostsUserReactions"."postId" = "posts"."postId"

  where "posts"."createdAt" < ${before} and "posts"."createdAt" > ${after}
    and ${filter}
  order by "createdAt" desc
  limit 50
`;

export const user = (myId : number | null, username : string) => sql`
  select
    "users"."userId",
    "username",
    "displayName",
    "followingId" is not null as "isFollowing"
  from "users"
  left join "following" on
    "following"."followingUserId" = "users"."userId"
    and "following"."userId" = ${myId}
  where "username" = ${username}
`;

export const userPosts = (
  myId : number | null,
  username : string,
  before : string,
  after : string
) => allPosts(
  myId,
  before,
  after,
  sql`"username" = ${username}`
);
