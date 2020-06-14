record Transition,
	to : String,
	predicate : Proc(Bool),
	weight : Int32

alias Transitions = Hash(String, Array(Transition))

def merge_transitions (transitions : Array(Transitions))
	result = Transitions.new
	transitions.each &.each do |key, value|
		result[key] = [] of Transition unless result[key]?
		result[key] += value
	end
	result
end

def make_transition(from, to, weight=100, predicate=->{ true })
	{ from => [ Transition.new(to, predicate, weight) ] }
end

class StateMachine
	@state : String
	@transitions: Transitions
	@listeners = {} of String => Array(Proc(Nil))

	def initialize (@transitions, @state : String)
	end

	def on (event : String, fn : Proc(Nil))
		@listeners[event] = [] of Proc(Nil) unless @listeners[event]?

		@listeners[event] << fn
	end

	def emit (event : String)
		return unless @listeners[event]?

		@listeners[event].each do |l|
			l.call
		end
	end

	def available_transitions
		return [] of Transition unless @transitions[@state]?

		@transitions[@state].select &.predicate.call
	end

	def choose_next
		buckets = [] of Tuple(Int32, Transition)
		acc = 0
		buckets = available_transitions.map do |t|
			acc += t.weight
			{ acc, t }
		end

		choice = Random.rand(0 ... acc)

		buckets.each do |b|
			return b[1] if choice < b[0]
		end

		raise "uh-oh"
	end

	def is_valid_transition (state)
		available_transitions.find do |t|
			t.to == state
		end.nil? == false
	end

	def goto (next_state : String)
		raise "invalid transition" unless is_valid_transition(next_state)

		emit "exit:#{@state}"
		@state = next_state
		emit "enter:#{next_state}"
	end
end
