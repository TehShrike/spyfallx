# game is broken without this

- game timer
	- record the timestamp when the game starts
	- for every game-info request, retrieve that timestamp, and return how many milliseconds are left in the game
- expire keys intelligently
	- like, say, 30 minutes since the last time someone made a request about a game?

# game probably isn't finished without this

- Ability to change your name
	- an input/button at the top of the screen?  bottom?
- Ability to remove players
- maybe make the colors better
	- the dark background as highlight around your role/location isn't great?

# deploy

- register spyfallx.com
- create Redis instance on AWS
- set up VPC (or whatever the correct acronym is)
- deploy with Up

# CI

- run tests
- deploy on push
