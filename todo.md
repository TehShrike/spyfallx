
# game screen

- if you're not an active member in the game, show an input to ask for your name, and then send a join request
- if the game id is invalid, need to display something useful (probably link back to home page)
- "start game"
- "end game"
- "leave game"
	- add /api/leave-game endpoint
	- navigate back to home page
- game timer
	- record the timestamp when the game starts
	- for every game-info request, retrieve that timestamp, and return how many milliseconds are left in the game
