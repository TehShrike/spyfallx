const dynamoDb = require(`./server/dynamodb-instance.js`)

const {
	playerSecret,
	player,
	game,
} = require(`./server/schema.js`)

const KEY_TYPE = {
	HASH: `HASH`,
	RANGE: `RANGE`,
}

async function main() {
	await dynamoDb.createTable({
		TableName: `playerSecret`,
		AttributeDefinitions: [
			playerSecret.secret,
		],
		KeySchema: [{
			AttributeName: `secret`,
			KeyType: KEY_TYPE.HASH,
		}],
		ProvisionedThroughput: {
			ReadCapacityUnits: 5000,
			WriteCapacityUnits: 500,
		},
	})

	await dynamoDb.createTable({
		TableName: `player`,
		AttributeDefinitions: [
			player.id,
		],
		KeySchema: [{
			AttributeName: `id`,
			KeyType: KEY_TYPE.HASH,
		}],
		ProvisionedThroughput: {
			ReadCapacityUnits: 5000,
			WriteCapacityUnits: 500,
		},
	}).promise()

	await dynamoDb.createTable({
		TableName: `game`,
		AttributeDefinitions: [
			game.id,
		],
		KeySchema: [{
			AttributeName: `id`,
			KeyType: KEY_TYPE.HASH,
		}],
		ProvisionedThroughput: {
			ReadCapacityUnits: 5000,
			WriteCapacityUnits: 500,
		},
	}).promise()
}


main().catch(e => {
	console.error(e)
})

