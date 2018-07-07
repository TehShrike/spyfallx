require(`loud-rejection/register`)

const pify = require(`pify`)
const Koa = require(`koa`)
const createRouter = require(`koa-bestest-router`)
const compress = require(`koa-compress`)
const conditionalGet = require(`koa-conditional-get`)
const etag = require(`koa-etag`)
const send = require(`koa-send`)
const koaBody = require(`koa-body`)
const redis = require(`redis`)
const reandom = require(`reandom`)
const Die = require(`gamblers-dice`)
const combine = require(`combine-arrays`)
const makeUuid = require(`just-uuid4`)

const locations = require(`../shared/locations.js`)
const makeShuffler = require(`./shuffler.js`)

const relative = path => require(`path`).join(__dirname, path)
const staticPath = relative(`../public/static`)
const buildPath = relative(`../public/build`)
const publicPath = relative(`../public`)

startServer(process.env.PORT || 8888)

const getRedis = () => pify(redis.createClient({
	host: `localhost`,
	port: 6379,
}))

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
const gameLocationSeed = gameId => `game:location-seed:${ gameId }`
const gameLocationKey = gameId => `game:location:${ gameId }`
const gameSpySeed = gameId => `game:spy-seed:${ gameId }`

const generateGameId = () => reandom.generate(5)

const createGame = async client => {
	const gameId = generateGameId()
	await client.set(gameActiveKey(gameId), `0`)
	return gameId
}

const getGameActive = async(client, gameId) => !!await client.get(gameActiveKey(gameId))

const getPlayerId = (client, playerSecret) => client.get(playerIdKey(playerSecret))

const addPlayerToGame = async(client, gameId, playerSecret) => client.sadd(
	gamePlayersKey(gameId),
	await getPlayerId(client, playerSecret)
)

const setPlayerName = async(client, playerSecret, name) => {
	const playerId = await getPlayerId(client, playerSecret)
	await client.set(playerNameKey(playerId), name)
}

const getPlayerName = async(client, playerId) => await client.get(playerNameKey(playerId))

const playerIsAuthedToGame = async(client, gameId, playerSecret) => !!await client.sismember(
	gamePlayersKey(gameId),
	await getPlayerId(client, playerSecret)
)

const freshSeed = count => new Array(count).fill(1)

const getSeed = async(client, key, count) => {
	const seed = await client.get(key)
	if (seed === null) {
		return freshSeed(count)
	} else {
		const seedArray = seed.split(SEED_NUMBER_SEPARATOR)

		return seedArray.length === count
			? seedArray
			: freshSeed(count)
	}
}

const getRandomIndexUsingSeed = async(client, key, count) => {
	const seedArray = await getSeed(client, key, count)

	const die = new Die()
	die.state = seedArray
	const index = die.roll()
	const newSeed = die.state.join(SEED_NUMBER_SEPARATOR)

	await client.set(key, newSeed)

	return index
}

const createPlayer = async(client, name) => {
	const playerId = makeUuid()
	const playerSecret = makeUuid()

	await Promise.all([
		setPlayerName(client, playerSecret, name),
		client.set(playerIdKey(playerSecret), playerId),
	])

	return {
		playerId,
		playerSecret,
	}
}

const getPlayerRole = async(client, gameId, playerId) => client.hget(gameRolesKey(gameId), playerId)
const getPlayerIdsInGame = async(client, gameId) => client.smembers(gamePlayersKey(gameId))

const getGameInformation = async(client, gameId) => {
	const playerIdsInRoom = await getPlayerIdsInGame(client, gameId)

	const gameInfoBatch = client.batch()

	gameInfoBatch.hkeys(gameRolesKey(gameId))
	getGameActive(gameInfoBatch, gameId)
	playerIdsInRoom.forEach(playerId => getPlayerName(gameInfoBatch, playerId))

	const [
		activePlayerIdsInGame,
		gameActive,
		...playerNames
	] = await gameInfoBatch.exec()

	const activePlayerIdsSet = new Set(activePlayerIdsInGame)

	const playersInRoom = combine({
		playerId: playerIdsInRoom,
		name: playerNames,
		active: playerIdsInRoom.map(id => activePlayerIdsSet.has(id)),
	})


	return {
		gameActive,
		playersInRoom,
	}
}

const getPlayerGameInformation = async(client, gameId, playerSecret) => {
	const gameActivePromise = getGameActive(client, gameId)
	const locationPromise = client.get(gameLocationKey(gameId))

	const playerId = await getPlayerId(client, playerSecret)


	const [ role, location ] = Promise.all([
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

async function startGame(client, gameId) {
	const [ playerIds, locationIndex ] = await Promise.all([
		getPlayerIdsInGame(gameId),
		getRandomIndexUsingSeed(client, gameLocationSeed(gameId), locations.length),
	])

	if (playerIds.length < 3) {
		return `You can't start a game with less than three players`
	}

	const location = locations[locationIndex]

	const [ spyIndex ] = await Promise.all([
		getRandomIndexUsingSeed(client, gameSpySeed(gameId), playerIds.length),
		client.set(gameActiveKey(gameId), `1`),
		client.set(gameLocationKey(gameId), location.name),
	])

	const getNextRole = makeShuffler(location.roles)

	const playerRoles = playerIds.map((_, index) => {
		if (index === spyIndex) {
			return SPY
		} else {
			return getNextRole()
		}
	})

	const playerRoleHash = combine({
		playerId: playerIds,
		role: playerRoles,
	}).map(({ playerId, role }) => [ playerId, role ])

	await client.htmset([
		gameRolesKey(gameId),
		...playerRoleHash,
	])
}

function startServer(port) {
	const app = new Koa()

	app.use(compress())
	app.use(conditionalGet())
	app.use(etag())
	app.use(koaBody())

	app.use(createRouter({
		GET: {
			'/static/:path(.+)': async context => {
				await send(context, context.params.path, { root: staticPath })
			},
			'/build/:path(.+)': async context => {
				await send(context, context.params.path, { root: buildPath })
			},
			'api/game/:gameId/player/:playerSecret': async context => {
				const { gameId, playerSecret } = context.params

				const client = await getRedis()
				context.body = await getPlayerGameInformation(client, gameId, playerSecret)
				client.quit()
			},
			'api/player-id/:playerSecret': async context => {
				const client = await getRedis()

				const { playerSecret } = context.params

				const playerId = await getPlayerId(client, playerSecret)

				context.body = {
					authed: !!playerId,
					playerId,
				}

				client.quit()
			},
			'/': async context => {
				await send(context, `index.html`, { root: publicPath })
			},
		},
		POST: {
			'api/set-name': async context => {
				const { name, playerSecret } = context.request.body

				const client = await getRedis()

				await setPlayerName(client, playerSecret, name)

				client.quit()
			},
			'/api/create': async context => {
				const client = await getRedis()
				const gameId = await createGame(client)
				client.quit()

				context.body = {
					gameId,
				}
			},
			'/api/join-game': async context => {
				const { gameId, playerSecret } = context.request.body
				const client = await getRedis()
				await addPlayerToGame(client, gameId, playerSecret)
				client.quit()
			},
			'api/start-game': async context => {
				const { gameId, playerSecret } = context.request.body
				const client = await getRedis()
				const authed = await playerIsAuthedToGame(client, playerSecret)

				if (authed) {
					await startGame(client, gameId)
				}

				client.quit()
				context.body = {
					success: authed,
				}
			},
			'/api/stop-game': async context => {
				const { gameId, playerSecret } = context.request.body
				const client = await getRedis()

				const authed = await playerIsAuthedToGame(client, playerSecret)

				if (authed) {
					await stopGame(client, gameId)
				}

				client.quit()
			},
			'/api/create-player': async context => {
				const client = await getRedis()

				const { name } = context.request.body

				const { playerId, playerSecret } = createPlayer(client, name)

				context.body = {
					playerId,
					playerSecret,
				}

				client.quit()
			},
		},
	}, { set404: true }))

	app.listen(port)
}
