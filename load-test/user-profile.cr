require "http"
require "xml"

require "./sm.cr"

def make_form (fields : Hash(String, String))
		io = IO::Memory.new
		content_type = nil
		HTTP::FormData.build(io) do |builder|
			content_type = builder.content_type
			fields.each do |key, value|
				builder.field(key, value)
			end
		end
		{ io.to_s, content_type.not_nil! }
end

class UserProfile
	@sm : StateMachine
	@url = "/"
	@username = Random::Secure.hex
	@password = Random::Secure.hex
	@cookie : HTTP::Cookie | Nil = nil
	@logger : Log

	def initialize
		@logger = Log.for(@username)

		@sm = StateMachine.new(merge_transitions([
			make_transition("start",     "signup",    ),
			make_transition("signup",    "feed",      ),

			make_transition("feed",      "make_post", ),
			make_transition("make_post", "feed",      ),

			make_transition("feed",      "like_post", predicate: ->can_like_post),
			make_transition("like_post", "feed",      ),

			make_transition("feed",      "user_page", predicate: ->can_goto_user_page),
			make_transition("user_page", "feed",      ),
			make_transition("user_page", "follow_user", ),
			make_transition("follow_user", "user_page", ),
		]), "start")

		@sm.on("enter:signup", ->signup)
		@sm.on("enter:feed", ->feed)
		@sm.on("enter:make_post", ->make_post)
		@sm.on("enter:like_post", ->like_post)
		@sm.on("enter:user_page", ->goto_user_page)
		@sm.on("enter:follow_user", ->follow_user)
	end

	def tick
		@sm.goto @sm.choose_next.to
	end

	def signup
		@logger.info { "signing up" }
		HTTP::Client.get "#{ENV["APP_URL"]}/signup"

		form_data, content_type = make_form({
			"username" => @username,
			"password" => @password
		})
		HTTP::Client.post(
			"#{ENV["APP_URL"]}/api/v1/createuser",
			body: form_data,
			headers: HTTP::Headers{"Content-Type" => content_type}
		)

		res = HTTP::Client.post(
			"#{ENV["APP_URL"]}/api/v1/createsession",
			body: form_data,
			headers: HTTP::Headers{"Content-Type" => content_type}
		)

		@cookie = res.cookies["tok"]

		nil
	end

	def feed
		@logger.info { "viewing feed" }
		res = HTTP::Client.get(
			"#{ENV["APP_URL"]}/",
			headers: HTTP::Headers{"cookie" => @cookie.not_nil!.to_cookie_header}
		)

		@html = XML.parse_html(res.body)

		nil
	end

	def make_post
		@logger.info { "making post" }
		form_data, content_type = make_form({ "content" => Random::Secure.hex(256) })
		res = HTTP::Client.post(
			"#{ENV["APP_URL"]}/api/v1/createpost",
			headers: HTTP::Headers{
				"cookie" => @cookie.not_nil!.to_cookie_header,
				"content-type" => content_type
			},
			body: form_data,
		)

		nil
	end

	def can_like_post
		inputs = @html.not_nil!.xpath("//form[@action=\"/api/v1/createpostreaction\"]//input[@name=\"postId\"]/@value")

		return inputs.is_a?(XML::NodeSet) && inputs.size > 0
	end

	def like_post
		@logger.info { "liking post" }
		inputs = @html.not_nil!.xpath("//form[@action=\"/api/v1/createpostreaction\"]//input[@name=\"postId\"]/@value")

		return unless inputs.is_a? XML::NodeSet

		post_id = inputs[rand(inputs.size)].content

		form_data, content_type = make_form({ "postId" => post_id, "type" => "❤️" })
		res = HTTP::Client.post(
			"#{ENV["APP_URL"]}/api/v1/createpostreaction",
			headers: HTTP::Headers{
				"cookie" => @cookie.not_nil!.to_cookie_header,
				"content-type" => content_type
			},
			body: form_data,
		)

		nil
	end

	def can_goto_user_page
		return false unless @html
		hrefs = @html.not_nil!.xpath("//a[contains(@href, '/u/')]/@href")

		return hrefs.is_a?(XML::NodeSet) && hrefs.size > 0
	end

	def goto_user_page
		@logger.info { "going to user page" }
		hrefs = @html.not_nil!.xpath("//a[contains(@href, '/u/')]/@href")

		raise "uh-oh" unless hrefs.is_a? XML::NodeSet
		href = hrefs[rand(hrefs.size)].content

		res = HTTP::Client.get(
			"#{ENV["APP_URL"]}#{href}",
			headers: HTTP::Headers{"cookie" => @cookie.not_nil!.to_cookie_header}
		)
		@html = XML.parse_html(res.body)

		nil
	end

	def follow_user
		@logger.info { "following user" }
		inputs = @html.not_nil!.xpath("//form[@action=\"/api/v1/createfollow\"]//input[@name=\"userId\"]/@value")

		return unless inputs.is_a?(XML::NodeSet) && inputs.size > 0

		user_id = inputs[rand(inputs.size)].content

		form_data, content_type = make_form({ "userId" => user_id })
		res = HTTP::Client.post(
			"#{ENV["APP_URL"]}/api/v1/createfollow",
			body: form_data,
			headers: HTTP::Headers{
				"cookie" => @cookie.not_nil!.to_cookie_header,
				"content-type" => content_type
			}
		)

		nil
	end
end
