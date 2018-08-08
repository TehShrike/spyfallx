# deploy the new branch

- run the schema creation script pointed at AWS
- turn on TTL for the database

# game is broken without this

- error messages for every failed response from the server
	- working reasonably well on the game page, but not the index

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
- replace "leave game" with "back to home page"?

# project isn't finished without this

- Ability to change your name
	- an input/button at the top of the screen?  bottom?
- Ability to remove players
- maybe make the colors better
	- the dark background as highlight around your role/location isn't great?
- add a robots.txt that blocks everything when deploying to staging
	- add a `cp` command to the circle.yml file for the staging deploy
- make the polling cheaper while the game is active
	- use the game id + game start timestamp to poll a new endpoint that just returns whether or not that game is still active and has the same game start timestamp
	- only start hitting the other two endpoints if it returns false
	- once the game is active again, go back to polling the cheap endpoint

# would be nice to have

- Spyfall 2 location/role list
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/lib/locations2.js
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/i18n/en.i18n.json
- internationalization
- a readme that gives a slightly better introduction - maybe with some of the rationale from the about page
