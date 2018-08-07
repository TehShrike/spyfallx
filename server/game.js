const combine = require(`combine-arrays`)

const reandom = require(`reandom`)
const Die = require(`gamblers-dice`)
const makeUuid = require(`just-uuid4`)
const random = require(`random-int`)
const generatePhonetic = require(`phonetic`).generate

const locations = require(`../shared/locations.js`)
const makeShuffler = require(`./shuffler.js`)

const TYPE = require(`./dynamo-types.js`)
const TABLES = require(`./schema.js`)
const {
	playerSecret,
	player,
	game,
} = TABLES

const SEED_NUMBER_SEPARATOR = ` `
const SPY = `Spy`

const swich = (value, map) => (map[value] || map.def)()


const oMap = (object, fn) => {
	const output = {}

	Object.entries(([ key, value ]) => {
		output[key] = fn(value)
	})

	return output
}

const serialize = (AttributeType, value) => swich(AttributeType, {
	[TYPE.NUMBER]: () => value.toString(),
	[TYPE.NUMBER_SET]: () => value.map(number => number.toString()),
	[TYPE.STRING]: () => value.toString(),
	[TYPE.MAP]: () => oMap(value, str => ({
		[TYPE.STRING]: str.toString(),
	})),
	def: () => value,
})

const deserialize = (AttributeType, value) => swich(AttributeType, {
	[TYPE.NUMBER]: () => parseFloat(value, 10),
	[TYPE.NUMBER_SET]: () => value.map(str => parseFloat(str, 10)),
	def: () => value,
})

const dynamoFieldProperty = (field, value) => ({
	[field.AttributeName]: {
		[field.AttributeType]: serialize(field.AttributeType, value),
	},
})

const dynamoFieldObject = fieldValues => Object.assign(
	...fieldValues.map(({ field, value }) => dynamoFieldProperty(field, value))
)

const expressionValueName = AttributeName => `:` + AttributeName
const expressionNameName = AttributeName => `#` + AttributeName

const currentTimestampSeconds = () => Math.round(Date.now() / 1000)
const defaultTtlSeconds = () => currentTimestampSeconds() + (60 * 60 * 24)

const putItemAndIncreaseTtl = async(dynamoDb, { table, fieldValues }) => putItem(dynamoDb, {
	table,
	fieldValues: [{ field: TABLES[table].ttl, value: defaultTtlSeconds() }, ...fieldValues ],
})

const putItem = async(dynamoDb, { table, fieldValues }) => dynamoDb.putItem({
	TableName: table,
	Item: dynamoFieldObject(fieldValues),
}).promise()

const buildAttributeNameObject = fields => {
	const o = {}
	fields.forEach(({ AttributeName }) => {
		o[expressionNameName(AttributeName)] = AttributeName
	})
	return o
}

const buildUpdateWithValues = ({ table, key, fieldValues }) => ({
	TableName: table,
	Key: dynamoFieldProperty(key.field, key.value),
	ExpressionAttributeNames: buildAttributeNameObject(fieldValues.map(({ field }) => field)),
	ExpressionAttributeValues: dynamoFieldObject(
		fieldValues.map(({ field, value }) => ({
			field: Object.assign({}, field, { AttributeName: expressionValueName(field.AttributeName) }),
			value,
		}))
	),
})

const updateItem = async(dynamoDb, { table, key, fieldValues }) => dynamoDb.updateItem(
	Object.assign(
		buildUpdateWithValues({ table, key, fieldValues }),
		{
			UpdateExpression: `SET ` + fieldValues.map(
				({ field }) => `${ expressionNameName(field.AttributeName) } = ${ expressionValueName(field.AttributeName) }`
			).join(`, `),
		}
	)
).promise()

const getItem = async(dynamoDb, { tableName, key, resultFields }) => {
	const data = await dynamoDb.getItem({
		TableName: tableName,
		Key: dynamoFieldObject([ key ]),
		AttributesToGet: resultFields.map(({ AttributeName }) => AttributeName),
		ConsistentRead: true,
	}).promise()

	const item = data.Item

	if (!item) {
		return null
	}

	const output = {}

	resultFields.forEach(field => {
		output[field.AttributeName] = getField(item, field)
	})

	return output
}

const getField = (item, field) => item[field.AttributeName]
	? deserialize(field.AttributeType, item[field.AttributeName][field.AttributeType])
	: null


















const generateGameId = () => reandom.generate(5)

const getPlayerId = async(dynamoDb, secret) => getItem(dynamoDb, {
	tableName: `playerSecret`,
	key: { field: playerSecret.secret, value: secret },
	resultFields: [
		playerSecret.playerId,
	],
}).then(playerSecretResult => playerSecretResult && playerSecretResult.playerId)

const getPlayerIdOrThrow = async(dynamoDb, secret) => {
	const playerId = await getPlayerId(dynamoDb, secret)

	if (!playerId) {
		throw new Error(`No playerId found for player secret ${ secret }`)
	}

	return playerId
}

const freshSeed = count => new Array(count).fill(1)

const getSeed = async(dynamoDb, { gameId, field, count }) => {
	const response = await getItem(dynamoDb, {
		tableName: `game`,
		key: { field: game.id, value: gameId },
		resultFields: [ field ],
	})

	const seed = response && response[field.AttributeName]

	if (seed) {
		const seedArray = seed.split(SEED_NUMBER_SEPARATOR)

		return seedArray.length === count
			? seedArray.map(str => parseInt(str, 10))
			: freshSeed(count)
	} else {
		return freshSeed(count)
	}
}

const getRandomIndexUsingSeed = async(dynamoDb, { gameId, field, count }) => {
	const seedArray = await getSeed(dynamoDb, { gameId, field, count })

	const die = new Die()
	die.state = seedArray
	const index = die.roll() - 1
	const newSeed = die.state.join(SEED_NUMBER_SEPARATOR)

	updateItem(dynamoDb, {
		table: `game`,
		key: { field: game.id, value: gameId },
		fieldValues: [{ field, value: newSeed }],
	})

	return index
}

// const getPlayerIdsInGame = async(dynamoDb, gameId) => client.smembers(gamePlayersKey(gameId))






const createGame = async dynamoDb => {
	const gameId = generateGameId()

	await putItemAndIncreaseTtl(dynamoDb, {
		table: `game`,
		fieldValues: [
			{ field: game.id, value: gameId },
			{ field: game.active, value: false },
		],
	})

	return gameId
}

const addPlayerToGame = async(dynamoDb, gameId, secret) => {
	const playerId = await getPlayerIdOrThrow(dynamoDb, secret)

	await dynamoDb.updateItem(
		Object.assign(
			buildUpdateWithValues({
				table: `game`,
				key: { field: game.id, value: gameId },
				fieldValues: [{ field: game.playerIds, value: [ playerId ] }],
			}),
			{
				UpdateExpression: `ADD ${ expressionNameName(game.playerIds.AttributeName) } ${ expressionValueName(game.playerIds.AttributeName) }`,
			}
		)
	).promise()
}

const removePlayerFromGame = async(dynamoDb, gameId, playerId) => {
	await dynamoDb.updateItem(
		Object.assign(
			buildUpdateWithValues({
				table: `game`,
				key: { field: game.id, value: gameId },
				fieldValues: [{ field: game.playerIds, value: [ playerId ] }],
			}),
			{
				UpdateExpression: `DELETE ${ expressionNameName(game.playerIds.AttributeName) } ${ expressionValueName(game.playerIds.AttributeName) }`,
			}
		)
	).promise()
}

const setPlayerNameWithPlayerSecret = async(dynamoDb, secret, name) => {
	const playerId = await getPlayerIdOrThrow(dynamoDb, secret)

	await putItemAndIncreaseTtl(dynamoDb, {
		table: `player`,
		fieldValues: [
			{ field: player.id, value: playerId },
			{ field: player.name, value: name },
		],
	})
}

const playerIsAuthedToGame = async(dynamoDb, gameId, secret) => {
	const [
		playerId,
		playerIdsInGame,
	] = await Promise.all([
		getPlayerIdOrThrow(dynamoDb, secret),

		getItem(dynamoDb, {
			tableName: `game`,
			key: { field: game.id, value: gameId },
			resultFields: [
				game.playerIds,
			],
		}).then(gameResult => gameResult ? gameResult.playerIds : []),
	])

	const playerIdsSet = new Set(playerIdsInGame)

	return playerIdsSet.has(playerId)
}

const createPlayer = async dynamoDb => {
	const playerId = makeUuid()
	const secret = makeUuid()

	const defaultPlayerName = generatePhonetic({
		syllables: 2,
		seed: playerId,
	})

	await Promise.all([
		putItemAndIncreaseTtl(dynamoDb, {
			table: `player`,
			fieldValues: [
				{ field: player.id, value: playerId },
				{ field: player.secret, value: secret },
				{ field: player.name, value: defaultPlayerName },
			],
		}),

		putItemAndIncreaseTtl(dynamoDb, {
			table: `playerSecret`,
			fieldValues: [
				{ field: playerSecret.secret, value: secret },
				{ field: playerSecret.playerId, value: playerId },
			],
		}),
	])

	return {
		playerId,
		playerSecret: secret,
	}
}

const getGameInformation = async(dynamoDb, gameId) => {
	const gameResponse = await getItem(dynamoDb, {
		tableName: `game`,
		key: { field: game.id, value: gameId },
		resultFields: [
			game.playerIds,
			game.active,
			game.firstPlayerId,
			game.startTimestamp,
		],
	})

	if (!gameResponse) {
		return null
	}

	const {
		playerIds,
		active,
		firstPlayerId,
		startTimestamp,
	} = gameResponse

	const playerNames = playerIds.length === 0
		? []
		: await dynamoDb.batchGetItem({
			RequestItems: {
				player: {
					Keys: playerIds.map(playerId => ({
						id: {
							[player.id.AttributeType]: serialize(player.id.AttributeType, playerId),
						},
					})),
					AttributesToGet: [
						player.name.AttributeName,
					],
				},
			},
		}).promise().then(data => data.Responses.player.map(item => getField(item, player.name)))


	const playersAndNames = combine({
		playerId: playerIds,
		name: playerNames,
	})

	if (!active) {
		return {
			gameActive: active,
			playersInRoom: playersAndNames,
		}
	}

	const elapsedTimeMs = Date.now() - startTimestamp

	const activePlayerIdsSet = new Set(playerIds)

	const playersInRoom = playersAndNames.map(player =>
		Object.assign(player, {
			active: activePlayerIdsSet.has(player.playerId),
		})
	)

	return {
		gameActive: active,
		playersInRoom,
		firstPlayerId,
		elapsedTimeMs,
	}
}

const getPlayerGameInformation = async(dynamoDb, gameId, secret) => {
	const playerId = await getPlayerIdOrThrow(dynamoDb, secret)

	const {
		active,
		location,
		roles,
	} = await getItem(dynamoDb, {
		tableName: `game`,
		key: { field: game.id, value: gameId },
		resultFields: [
			game.active,
			game.location,
			game.roles,
		],
	})

	const role = roles && roles[playerId]

	return active
		? {
			role,
			location: role === SPY ? null : location,
		}
		: {}
}

const stopGame = async(dynamoDb, gameId) => updateItem(dynamoDb, {
	table: `game`,
	key: { field: game.id, value: gameId },
	fieldValues: [{ field: game.active, value: false }],
})


const startGame = async(dynamoDb, gameId) => {
	const [ playerIds, locationIndex ] = await Promise.all([
		getItem(dynamoDb, {
			tableName: `game`,
			key: { field: game.id, value: gameId },
			resultFields: [
				game.playerIds,
			],
		}).then(gameResponse => gameResponse.playerIds),

		getRandomIndexUsingSeed(dynamoDb, { gameId, field: game.locationSeed, count: locations.length }),
	])

	const playerCount = playerIds.length

	if (playerCount < 3) {
		throw new Error(`You can't start a game with less than three players`)
	}

	const firstPlayerId = playerIds[random(playerCount - 1)]
	const location = locations[locationIndex]
	const getNextRole = makeShuffler(location.roles)

	const spyIndex = await getRandomIndexUsingSeed(dynamoDb, { gameId, field: game.spySeed, count: playerIds.length })

	const playerRoles = playerIds.map((_, index) => {
		if (index === spyIndex) {
			return SPY
		} else {
			return getNextRole()
		}
	})

	const playerRoleMap = {}
	combine({
		playerId: playerIds,
		role: playerRoles,
	}).forEach(({ playerId, role }) => playerRoleMap[playerId] = role)

	await updateItem(dynamoDb, {
		table: `game`,
		key: { field: game.id, value: gameId },
		fieldValues: [
			{ field: game.active, value: true },
			{ field: game.location, value: location.name },
			{ field: game.firstPlayerId, value: firstPlayerId },
			{ field: game.startTimestamp, value: Date.now() },
			{ field: game.roles, value: playerRoleMap },
		],
	})

	return {
		success: true,
	}
}

module.exports = {
	createGame,
	getPlayerId,
	addPlayerToGame,
	removePlayerFromGame,
	setPlayerNameWithPlayerSecret,
	playerIsAuthedToGame,
	createPlayer,
	getGameInformation,
	getPlayerGameInformation,
	stopGame,
	startGame,
}
