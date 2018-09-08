const DynamoDB = require('aws-sdk/clients/dynamodb')

const useAws = !!process.env.UP_STAGE

const contextSpecificOptions = useAws
	? {}
	: {
		endpoint: `localhost:8000`,
		sslEnabled: false,
	}

export default new DynamoDB(Object.assign({
	apiVersion: `2012-08-10`,
	region: `us-east-1`,
}, contextSpecificOptions))
