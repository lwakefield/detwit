require "./user-profile.cr"

users = [] of UserProfile

ARGV[0].to_i32.times do
	spawn do
		user = UserProfile.new
		users << user
		loop do
			user.tick
			sleep 2.seconds + rand(1000).milliseconds
		end
	end
end

loop do
	Fiber.yield
end
