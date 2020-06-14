select
"posts"."createdAt",
"following"."userId",
'post' as "type",
json_build_object(
	'postId', "posts"."postId",
	'content', "posts"."content",
	'author', json_build_object(
		'displayName', "author"."displayName",
		'username', "author"."username"
	)
) as "entry"
from "following"
join "posts" on "posts"."userId" = "followingUserId"
join "users" as "author" on "posts"."userId" = "author"."userId"
where "following"."userId" =
(select "userId" from "users" where "username"='e6c29e55ae3ce3bfddc737774e9f576d')


union all

select
"postReactions"."createdAt",
"following"."userId",
'reaction' as "type",
json_build_object(
	'postId', "posts"."postId",
	'content', "posts"."content",
	'author', json_build_object(
		'displayName', "author"."displayName",
		'username', "author"."username"
	),
	'actor', json_build_object(
		'displayName', "actor"."displayName",
		'username', "actor"."username"
	)
) as "entry",
from "following"
join "postReactions" on "postReactions"."userId" = "followingUserId"
join "posts"         on "posts"."postId" = "postReactions"."postId"
join "users" as "author" on "posts"."userId" = "author"."userId"
join "users" as "actor" on "postReactions"."userId" = "actor"."userId"
where "following"."userId" =
(select "userId" from "users" where "username"='e6c29e55ae3ce3bfddc737774e9f576d')


order by "createdAt" desc
limit 50
