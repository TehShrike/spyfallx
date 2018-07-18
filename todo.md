
# game screen

- Ability to change your name
	- an input/button at the top of the screen?  bottom?
- if you join a game and don't have a name set, generate a random name for you: https://github.com/TomFrost/node-phonetic
- if the game id is invalid, need to display something useful (probably link back to home page)
- game timer
	- record the timestamp when the game starts
	- for every game-info request, retrieve that timestamp, and return how many milliseconds are left in the game
- Ability to remove players
- maybe make the colors better
	- the dark background as highlight around your role/location isn't great?
- expire keys intelligently
	- like, say, 30 minutes since the last time someone made a request about a game?
