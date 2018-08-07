// const AWS = require(`aws-sdk`)
const DynamoDB = require(`aws-sdk/clients/dynamodb`)

const deployedToAws = !!process.env.UP_STAGE

const contextSpecificOptions = deployedToAws
	? {}
	: {
		endpoint: `localhost:8000`,
		sslEnabled: false,
	}

const dynamoDb = new DynamoDB(Object.assign({
	apiVersion: `2012-08-10`,
	region: `us-east-1`,
}, contextSpecificOptions))

module.exports = dynamoDb
