import { client, init } from '../db.ts';

await init();
// transparency - you should be able to see who XX followed at a given time
// anonymity by default
// all identifiers are wrapped in ""
await client.query(`
   create extension pgcrypto;

   create table "loggedActions" (
       "schemaName" text not null,
       "tableName"  text not null,
       "timestamp"  timestamptz not null default current_timestamp ,
       "action"     text not null check ("action" in ('I', 'D', 'U')),
       "oldData"   text,
       "newData"   text
   );
   create index on "loggedActions"((("schemaName"||'.'||"tableName")::text));
   create index on "loggedActions"("timestamp");
   create index on "loggedActions"("action");

   create or replace function log_table_history() returns trigger as $body$
   declare
       v_old_data text;
       v_new_data text;
   begin
       if (tg_op in ('UPDATE', 'DELETE') ) then
           insert into "loggedActions" ("schemaName", "tableName", "action", "oldData")
           values (tg_table_schema::text, tg_table_name::text, substring(tg_op,1,1), row(old.*));
           return new;
       else
           raise warning '[log_table_history] - other action occurred: %, at %',tg_op,now();
           return null;
       end if;

   exception
       when data_exception then
           raise warning '[log_table_history] - udf error [data exception] - sqlstate: %, sqlerrm: %',sqlstate,sqlerrm;
           return null;
       when unique_violation then
           raise warning '[log_table_history] - udf error [unique] - sqlstate: %, sqlerrm: %',sqlstate,sqlerrm;
           return null;
       when others then
           raise warning '[log_table_history] - udf error [other] - sqlstate: %, sqlerrm: %',sqlstate,sqlerrm;
           return null;
   end;
   $body$
   language plpgsql;

   create table "users" (
       "userId"      serial primary key,
       "createdAt"   timestamptz default current_timestamp,
       "modifiedAt"  timestamptz default current_timestamp,

       "username"    varchar(255) unique,
       "passwordHash"    varchar(255) not null,
       "displayName" varchar(255)
   );
   create trigger "usersLog" after update or delete on "users"
     for each row execute procedure log_table_history();

   create table "sessionTokens" (
       "sessionId"  serial primary key,
       "userId"     integer not null references "users",
       "token"      text default encode(gen_random_bytes(32), 'hex'),
       "expiresAt"  timestamptz default current_timestamp + interval '7 days'
   );

   create table "posts" (
       "postId"  serial primary key,
       "createdAt"   timestamptz default current_timestamp,
       "modifiedAt"  timestamptz default current_timestamp,

       "userId"  integer references "users",
       "content" text
   );
   create trigger "postsLog" after update or delete on "posts"
     for each row execute procedure log_table_history();
   create index on "posts" ("createdAt");
   create index on "posts" ("userId");

   create table "following" (
       "followingId" serial primary key,
       "createdAt"   timestamptz default current_timestamp,
       "modifiedAt"  timestamptz default current_timestamp,

       "userId"          integer not null references "users",
       "followingUserId" integer not null references "users",

       unique ("userId", "followingUserId")
   );
   create trigger "followingLog" after update or delete on "following"
     for each row execute procedure log_table_history();
   create index on "following" ( "userId" );
   create index on "following" ( "followingUserId" );

   create table "postReactions" (
       "reactionId" serial primary key,
       "createdAt"   timestamptz default current_timestamp,
       "modifiedAt"  timestamptz default current_timestamp,

       "postId"     integer references "posts",
       "userId"     integer references "users",
       "type"       varchar(255),

       unique ("postId", "userId", "type")
   );
   create trigger "postReactionsLog" after update or delete on "postReactions"
     for each row execute procedure log_table_history();
   create index on "postReactions" ("createdAt");
   create index on "postReactions" ("userId");

   create view "apiPostsAllReactions" as (
       with "reactionCounts" as (
         select "postId", "type", count(*) as "count"
         from "postReactions"
         group by "postId", "type"
       ),
       "reactionCountsAgg" as (
         select
           "postId",
           json_object_agg("type", "count") as counts
         from "reactionCounts"
         group by "postId"
       )
       select
         "postId",
         coalesce("reactionCountsAgg"."counts", '{}'::json) as "reactionCounts"
       from "posts"
       left join "reactionCountsAgg" using ("postId")
   );

   create view "apiPostsUserReactions" as (
       select
         "postId",
         "userId",
         json_object_agg("type", true) as counts
       from "postReactions"
       group by "postId", "userId"
   );

   create or replace function userJSON(integer) returns json
   as $$ select json_build_object(
     'userId', "users"."userId",
     'displayName', "users"."displayName",
     'username', "users"."username"
   )
   from "users" where "userId" = $1
   $$ language sql;

   create or replace function postJSON(integer, integer) returns json
   as $$ select json_build_object(
     'postId', "posts"."postId",
     'content', "posts"."content",
     'author', userJSON("posts"."userId"),
     'reactionCounts', "apiPostsAllReactions"."reactionCounts",
     'myReactions', coalesce("apiPostsUserReactions"."counts", '{}'::json)
   )
   from "posts"
   left join "apiPostsAllReactions" using ("postId")
   left join "apiPostsUserReactions"
     on "apiPostsUserReactions"."userId" = $2
     and "apiPostsUserReactions"."postId" = "posts"."postId"
   where "posts"."postId" = $1
   $$ language sql;
`);
