-- a user's feed is a list of events which are relevent to them.
-- set api.userId = 133;

drop materialized view if exists "apiUserFeeds";

-- create materialized view "apiUserFeeds" as
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

-- where "following"."userId" = current_setting('api.userId')::integer

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
		)
	) as "entry"
from "following"
join "postReactions" on "postReactions"."userId" = "followingUserId"
join "posts"         on "posts"."postId" = "postReactions"."postId"
join "users" as "author" on "posts"."userId" = "author"."userId"



order by "createdAt" desc
limit 10
;
