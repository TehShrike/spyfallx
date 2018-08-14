# game is broken without this

- On the home screen, if you hit "start game" without entering a name first, just start a new game and join it without a name
- When polling messages fail, display an error, but remove the error message when the next polling response comes in
- When requests fail in general, maybe display a warning somewhere, but keep retrying, because autoscaling will probably eventually make it work

# Shouldn't tell people about it without this

- affiliate link to Spyfall on Amazon
- link to Patreon
- "about" page
	- justification
	- explanation of randomness
	- link to Github
	- link to Twitter
- Ability to change your name
	- an input/button at the top of the screen?  bottom?

# project isn't finished without this

- eliminate "end this game" and replace with "start a new game"?
- Ability to remove players
- On the game screen, make "start game" appear/act disabled until there are 3+ players
- maybe make the colors better
	- especially the dark blue background/hover colors on the primary buttons
		- try making the non-hovered blue lighter
	- the red button needs to get darker on hover
	- the dark background as highlight around your role/location isn't great?
- It's still possible to cause unexpected errors to be thrown by sending bad input to some endpoints
- add a robots.txt that blocks everything when deploying to staging
	- add a `cp` command to the circle.yml file for the staging deploy
- polish the schema creation script
	- [Enable autoscaling](https://github.com/Signiant/dynamodb-autoscale-enabler)
	- call [updateTimeToLive](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateTimeToLive-property) from the schema creation script
- it's apparently possible to get Firefox (at least) to fire a bunch of setInterval callbacks right after each other if you kill focus on it for a while.  Need to add something to `loadGameStateOnceAtATime` to keep it from firing if it has fired in the last 500ms or something

# would be nice to have

- Spyfall 2 location/role list
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/lib/locations2.js
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/i18n/en.i18n.json
- internationalization
- a readme that gives a slightly better introduction - maybe with some of the rationale from the about page
