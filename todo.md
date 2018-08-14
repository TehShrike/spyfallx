# game is broken without this

- If you hit "start game" without entering a name first, just start a new game and join it without a name
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
- replace "leave game" with "back to home page"?
- need focus indicator around buttons

# project isn't finished without this

- Ability to change your name
	- an input/button at the top of the screen?  bottom?
- Ability to remove players
- maybe make the colors better
	- the dark background as highlight around your role/location isn't great?
- add a robots.txt that blocks everything when deploying to staging
	- add a `cp` command to the circle.yml file for the staging deploy
- disable the "start game" button when there are less than three players in the game
- polish the schema creation script
	- [Enable autoscaling](https://github.com/Signiant/dynamodb-autoscale-enabler)
	- call [updateTimeToLive](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateTimeToLive-property) from the schema creation script

# would be nice to have

- Spyfall 2 location/role list
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/lib/locations2.js
	- https://github.com/mpcovcd/spyfall/blob/master/spyfall/i18n/en.i18n.json
- internationalization
- a readme that gives a slightly better introduction - maybe with some of the rationale from the about page
