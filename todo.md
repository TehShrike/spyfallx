
# game screen

- if you're not an active member in the game, show an input to ask for your name, and then send a join request
	- or maybe generate a random name for you: https://github.com/TomFrost/node-phonetic
- prefill the "name" field on the main page when there is a saved name
- if the game id is invalid, need to display something useful (probably link back to home page)
- game timer
	- record the timestamp when the game starts
	- for every game-info request, retrieve that timestamp, and return how many milliseconds are left in the game
- Ability to remove players
- Ability to change your name
