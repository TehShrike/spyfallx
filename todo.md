# game is broken without this

- game timer
	- record the timestamp when the game starts
	- for every game-info request, retrieve that timestamp, and return how many milliseconds are left in the game
- expire keys intelligently
	- like, say, 30 minutes since the last time someone made a request about a game?

# Shouldn't tell people about it without this

- The front page UI really sucks
	- try having just the name input and the two buttons
		- if they choose "join game" prompt them for the code
		- if they choose "start game" prompt them for spyfall 1 vs 2
	- title case the text in the buttons
- affiliate link to Spyfall on Amazon
- link to Patreon
- "about" page
	- justification
	- explanation of randomness
	- link to Github
	- link to Twitter

# project isn't finished without this

- Ability to change your name
	- an input/button at the top of the screen?  bottom?
- Ability to remove players
- maybe make the colors better
	- the dark background as highlight around your role/location isn't great?

# would be nice to have

- Spyfall 2 location/role list
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/lib/locations2.js
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/i18n/en.i18n.json
- internationalization
- a readme that gives a slightly better introduction - maybe with some of the rational from the about page

# deploy

- make sure the subnets have plenty of IPs available
	- http://www.subnet-calculator.com/cidr.php
- set up a public/private subnet in two availability zones mebbe
- script the AWS environment setup?
