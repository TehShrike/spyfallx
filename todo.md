# game is broken without this

- "active player" tracking doesn't currently make sense - need to track `activePlayerIds` separately from `playerIds`
- When polling messages fail, display an error, but remove the error message when the next polling response comes in

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
	- include a "last deetz id" with every request
	- server looks up the current "deetz id" and then only bothers looking up the rest of the data if there has been a change
- disable the "start game" button when there are less than three players in the game
- call [updateTimeToLive](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateTimeToLive-property) from the schema creation script

# would be nice to have

- Spyfall 2 location/role list
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/lib/locations2.js
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/i18n/en.i18n.json
- internationalization
- a readme that gives a slightly better introduction - maybe with some of the rationale from the about page
