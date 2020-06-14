require "./user-profile.cr"

users = [] of UserProfile

MAX_USERS = 2

loop do
	if users.size < MAX_USERS
		spawn do
			user = UserProfile.new
			users << user
			loop do
				user.tick
				sleep 200.milliseconds
			end
		end
	end

	sleep 20.seconds
end
