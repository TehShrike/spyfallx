# game is broken without this

- if the game id is invalid, need to display something useful (probably link back to home page)
- game timer
	- record the timestamp when the game starts
	- for every game-info request, retrieve that timestamp, and return how many milliseconds are left in the game
- expire keys intelligently
	- like, say, 30 minutes since the last time someone made a request about a game?
- Highlight players who do not have a role in the current game

# game probably isn't finished without this

- Ability to change your name
	- an input/button at the top of the screen?  bottom?
- Ability to remove players
- maybe make the colors better
	- the dark background as highlight around your role/location isn't great?
