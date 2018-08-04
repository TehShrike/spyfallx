const combine = require(`combine-arrays`)

const reandom = require(`reandom`)
const Die = require(`gamblers-dice`)
const makeUuid = require(`just-uuid4`)
const random = require(`random-int`)
const generatePhonetic = require(`phonetic`).generate

const locations = require(`../shared/locations.js`)
const makeShuffler = require(`./shuffler.js`)

const SEED_NUMBER_SEPARATOR = ` `
const SPY = `Spy`

/*
data structures

games have players
games have locations
games have an id
games track which players have which roles
games can be in the middle of a round, or not
players have names
players have a secret that identifies the browser session
players have a public id that identifies them to other clients
your public player id can be derived from your secret player id
your role in a game can only be derived from your secret

player:name:{playerId} = name
player:id:{secret} = id
game:players:{gameId} = set of player ids
game:roles:{gameId} = hash
	{playerId} = role
game:active:{gameId}
*/

const playerNameKey = playerId => `player:name:${ playerId }`
const playerIdKey = playerSecret => `player:id:${ playerSecret }`
const gamePlayersKey = gameId => `game:players:${ gameId }`
const gameRolesKey = gameId => `game:roles:${ gameId }`
const gameActiveKey = gameId => `game:active:${ gameId }`
const gameLocationSeedKey = gameId => `game:location-seed:${ gameId }`
const gameLocationKey = gameId => `game:location:${ gameId }`
const gameSpySeedKey = gameId => `game:spy-seed:${ gameId }`
const gameFirstPlayerKey = gameId => `game:first-player-id:${ gameId }`

const generateGameId = () => reandom.generate(5)

const NOT_FOUND = {}

const getGameActive = async(client, gameId) => {
	const result = await client.get(gameActiveKey(gameId))

	if (!result) {
		return NOT_FOUND
	}

	return result === `1`
}

const getPlayerIdOrThrow = async(client, playerSecret) => {
	const playerId = await getPlayerId(client, playerSecret)

	if (!playerId) {
		throw new Error(`No playerId found for player secret ${ playerSecret }`)
	}

	return playerId
}

const setPlayerNameWithPlayerId = async(client, playerId, name) => {
	await client.set(playerNameKey(playerId), name)
}

const getPlayerName = async(client, playerId) => await client.get(playerNameKey(playerId))

const freshSeed = count => new Array(count).fill(1)

const getSeed = async(client, key, count) => {
	const seed = await client.get(key)
	if (seed === null) {
		return freshSeed(count)
	} else {
		const seedArray = seed.split(SEED_NUMBER_SEPARATOR)

		return seedArray.length === count
			? seedArray.map(str => parseInt(str, 10))
			: freshSeed(count)
	}
}

const getRandomIndexUsingSeed = async(client, key, count) => {
	const seedArray = await getSeed(client, key, count)

	const die = new Die()
	die.state = seedArray
	const index = die.roll() - 1
	const newSeed = die.state.join(SEED_NUMBER_SEPARATOR)

	await client.set(key, newSeed)

	return index
}

const getPlayerRole = async(client, gameId, playerId) => client.hget(gameRolesKey(gameId), playerId)
const getPlayerIdsInGame = async(client, gameId) => client.smembers(gamePlayersKey(gameId))






const createGame = async client => {
	const gameId = generateGameId()
	await client.set(gameActiveKey(gameId), `0`)
	return gameId
}

const getPlayerId = (client, playerSecret) => client.get(playerIdKey(playerSecret))

const addPlayerToGame = async(client, gameId, playerSecret) => {
	const playerId = await getPlayerIdOrThrow(client, playerSecret)

	await client.sadd(gamePlayersKey(gameId), playerId)
}

const removePlayerFromGame = async(client, gameId, playerId) => client.srem(gamePlayersKey(gameId), playerId)

const setPlayerNameWithPlayerSecret = async(client, playerSecret, name) => {
	const playerId = await getPlayerIdOrThrow(client, playerSecret)

	await setPlayerNameWithPlayerId(client, playerId, name)
}

const playerIsAuthedToGame = async(client, gameId, playerSecret) => !!await client.sismember(
	gamePlayersKey(gameId),
	await getPlayerIdOrThrow(client, playerSecret)
)

const createPlayer = async client => {
	const playerId = makeUuid()
	const playerSecret = makeUuid()

	const defaultPlayerName = generatePhonetic({
		syllables: 2,
		seed: playerId,
	})

	await Promise.all([
		setPlayerNameWithPlayerId(client, playerId, defaultPlayerName),
		client.set(playerIdKey(playerSecret), playerId),
	])

	return {
		playerId,
		playerSecret,
	}
}

const getGameInformation = async(client, gameId) => {
	const playerIdsInRoom = await getPlayerIdsInGame(client, gameId)

	const [
		activePlayerIdsInGame,
		gameActive,
		firstPlayerId,
		...playerNames
	] = await Promise.all([
		client.hkeys(gameRolesKey(gameId)),
		getGameActive(client, gameId),
		client.get(gameFirstPlayerKey(gameId)),
		...playerIdsInRoom.map(playerId => getPlayerName(client, playerId)),
	])

	if (gameActive === NOT_FOUND) {
		return null
	}

	const playersAndNames = combine({
		playerId: playerIdsInRoom,
		name: playerNames,
	})

	if (!gameActive) {
		return {
			gameActive,
			playersInRoom: playersAndNames,
		}
	}

	const activePlayerIdsSet = new Set(activePlayerIdsInGame)

	const playersInRoom = playersAndNames.map(player => Object.assign(player, {
		active: activePlayerIdsSet.has(player.playerId),
	}))

	return {
		gameActive,
		playersInRoom,
		firstPlayerId,
	}
}

const getPlayerGameInformation = async(client, gameId, playerSecret) => {
	const gameActivePromise = getGameActive(client, gameId)
	const locationPromise = client.get(gameLocationKey(gameId))

	const playerId = await getPlayerId(client, playerSecret)


	const [ role, location ] = await Promise.all([
		getPlayerRole(client, gameId, playerId),
		locationPromise,
		gameActivePromise,
	])

	return {
		role,
		location: role === SPY ? null : location,
	}
}

const stopGame = (client, gameId) => client.set(gameActiveKey(gameId), `0`)

const startGame = async(client, gameId) => {
	const [ playerIds, locationIndex ] = await Promise.all([
		getPlayerIdsInGame(client, gameId),
		getRandomIndexUsingSeed(client, gameLocationSeedKey(gameId), locations.length),
	])

	const playerCount = playerIds.length

	if (playerCount < 3) {
		throw new Error(`You can't start a game with less than three players`)
	}

	const firstPlayerId = playerIds[random(playerCount - 1)]

	const location = locations[locationIndex]

	const [ spyIndex ] = await Promise.all([
		getRandomIndexUsingSeed(client, gameSpySeedKey(gameId), playerIds.length),
		client.mset({
			[gameActiveKey(gameId)]: `1`,
			[gameLocationKey(gameId)]: location.name,
			[gameFirstPlayerKey(gameId)]: firstPlayerId,
		}),
	])

	const getNextRole = makeShuffler(location.roles)

	const playerRoles = playerIds.map((_, index) => {
		if (index === spyIndex) {
			return SPY
		} else {
			return getNextRole()
		}
	})

	const playerRoleHash = new Map(
		combine({
			playerId: playerIds,
			role: playerRoles,
		}).map(({ playerId, role }) => [ playerId, role ])
	)

	await client.hmset([
		gameRolesKey(gameId),
		playerRoleHash,
	])

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
