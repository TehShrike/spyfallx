# project isn't finished without this

- Ability to remove players
- It's still possible to cause unexpected errors to be thrown by sending bad input to some endpoints
- [Enable on-demand capacity](https://aws.amazon.com/blogs/aws/amazon-dynamodb-on-demand-no-capacity-planning-and-pay-per-request-pricing/)
- call [updateTimeToLive](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateTimeToLive-property) from the schema creation script
- it's apparently possible to get Firefox (at least) to fire a bunch of setInterval callbacks right after each other if you kill focus on it for a while.  Should add something to `loadGameStateOnceAtATime` to keep it from firing if it has fired in the last 500ms or something
- When polling messages fail, display an error, but remove the error message when the next polling response comes in


# would be nice to have

- internationalization
- a readme that gives a slightly better introduction - maybe with some of the rationale from the about page
	- also include a link to the roadmap (this file), and information about how I will help you through the contribution process
	- open an issue for the feature if there isn't one already
	- announce that you're working on the thing, and ask for any help you need

