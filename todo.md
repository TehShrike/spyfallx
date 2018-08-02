# game is broken without this

- game timer
	- record the timestamp when the game starts
	- for every game-info request, retrieve that timestamp, and return how many milliseconds are left in the game
- expire keys intelligently
	- like, say, 30 minutes since the last time someone made a request about a game?

# project isn't finished without this

- Ability to change your name
	- an input/button at the top of the screen?  bottom?
- Ability to remove players
- The front page UI really sucks
	- try having just the name input and the two buttons
		- if they choose "join game" prompt them for the code
		- if they choose "start game" prompt them for spyfall 1 vs 2
	- title case the text in the buttons
- readme to allow others to contribute
	- "if you want to submit a PR to change gameplay, open an issue so we can talk it over first"
- affiliate link to Spyfall on Amazon
- link to Patreon
- maybe make the colors better
	- the dark background as highlight around your role/location isn't great?
- "about" page
	- justification
	- explanation of randomness
	- link to Github
	- link to Twitter

# would be nice to have

- Spyfall 2 location/role list
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/lib/locations2.js
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/i18n/en.i18n.json
- Server: move game logic code to its own file
- internationalization

# deploy

- make sure the subnets have plenty of IPs available
- set up a public/private subnet in two availability zones mebbe
- script the AWS environment setup?

# CI

- run tests
- deploy on push
