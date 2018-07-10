require(`hard-rejection/register`)
require(`loud-rejection/register`)

const Koa = require(`koa`)
const createRouter = require(`koa-bestest-router`)
const compress = require(`koa-compress`)
const conditionalGet = require(`koa-conditional-get`)
const etag = require(`koa-etag`)
const send = require(`koa-send`)
const koaBody = require(`koa-body`)
const Redis = require(`ioredis`)
const reandom = require(`reandom`)
const Die = require(`gamblers-dice`)
const combine = require(`combine-arrays`)
const makeUuid = require(`just-uuid4`)
const random = require(`random-int`)

const locations = require(`../shared/locations.js`)
const makeShuffler = require(`./shuffler.js`)

const relative = path => require(`path`).join(__dirname, path)
const buildPath = relative(`../public/build`)
const publicPath = relative(`../public`)

startServer(process.env.PORT || 8888)

const getRedis = () => new Redis({
	host: `localhost`,
	port: 6379,
})

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

const createGame = async client => {
	const gameId = generateGameId()
	await client.set(gameActiveKey(gameId), `0`)
	return gameId
}

const getGameActive = async(client, gameId) => {
	const result = await client.get(gameActiveKey(gameId))

	return result === `1`
}

const getPlayerId = (client, playerSecret) => client.get(playerIdKey(playerSecret))
const getPlayerIdOrThrow = async(client, playerSecret) => {
	const playerId = await getPlayerId(client, playerSecret)

	if (!playerId) {
		throw new Error(`No playerId found for player secret ${ playerSecret }`)
	}

	return playerId
}

const addPlayerToGame = async(client, gameId, playerSecret) => {
	const playerId = await getPlayerIdOrThrow(client, playerSecret)

	await client.sadd(gamePlayersKey(gameId), playerId)
}

const removePlayerFromGame = async(client, gameId, playerId) => client.srem(gamePlayersKey(gameId), playerId)

const setPlayerNameWithPlayerSecret = async(client, playerSecret, name) => {
	const playerId = await getPlayerIdOrThrow(client, playerSecret)

	await setPlayerNameWithPlayerId(client, playerId, name)
}

const setPlayerNameWithPlayerId = async(client, playerId, name) => {
	await client.set(playerNameKey(playerId), name)
}

const getPlayerName = async(client, playerId) => await client.get(playerNameKey(playerId))

const playerIsAuthedToGame = async(client, gameId, playerSecret) => !!await client.sismember(
	gamePlayersKey(gameId),
	await getPlayerIdOrThrow(client, playerSecret)
)

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
	const index = die.roll()
	const newSeed = die.state.join(SEED_NUMBER_SEPARATOR)

	await client.set(key, newSeed)

	return index
}

const createPlayer = async client => {
	const playerId = makeUuid()
	const playerSecret = makeUuid()

	await client.set(playerIdKey(playerSecret), playerId)

	return {
		playerId,
		playerSecret,
	}
}

const getPlayerRole = async(client, gameId, playerId) => client.hget(gameRolesKey(gameId), playerId)
const getPlayerIdsInGame = async(client, gameId) => client.smembers(gamePlayersKey(gameId))

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

async function startGame(client, gameId) {
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

const runWithRedis = async fn => {
	const client = getRedis()
	await fn(client)
	client.quit()
}

const success = (context, body) => context.body = Object.assign({
	success: true,
}, body)

function startServer(port) {
	const app = new Koa()

	app.use(compress())
	app.use(conditionalGet())
	app.use(etag())
	app.use(koaBody())

	app.use(createRouter({
		GET: {
			'/build/:path(.+)': async context => {
				await send(context, context.params.path, { root: buildPath })
			},
			'/api/game/:gameId/player/:playerSecret': async context => {
				const { gameId, playerSecret } = context.params

				await runWithRedis(async client => {
					success(context, await getPlayerGameInformation(client, gameId, playerSecret))
				})
			},
			'/api/game/:gameId': async context => {
				const { gameId } = context.params

				await runWithRedis(async client => {
					success(context, await getGameInformation(client, gameId))
				})
			},
			'/api/player-id/:playerSecret': async context => {
				const { playerSecret } = context.params

				await runWithRedis(async client => {
					const playerId = await getPlayerId(client, playerSecret)

					success(context, {
						authed: !!playerId,
						playerId,
					})
				})
			},
			'/': async context => {
				await send(context, `index.html`, { root: publicPath })
			},
			'/:path(.+)': async context => {
				await send(context, context.params.path, { root: publicPath })
			},
		},
		POST: {
			'/api/set-name': async context => {
				const { name, playerSecret } = context.request.body

				await runWithRedis(async client => {
					await setPlayerNameWithPlayerSecret(client, playerSecret, name)

					success(context)
				})
			},
			'/api/create': async context => {
				await runWithRedis(async client => {
					const gameId = await createGame(client)

					success(context, {
						gameId,
					})
				})
			},
			'/api/join-game': async context => {
				const { gameId, playerSecret } = context.request.body

				await runWithRedis(async client => {
					await addPlayerToGame(client, gameId, playerSecret)

					success(context)
				})
			},
			'/api/remove-from-game': async context => {
				const { gameId, playerId } = context.request.body

				await runWithRedis(async client => {
					await removePlayerFromGame(client, gameId, playerId)

					success(context)
				})
			},
			'/api/start-game': async context => {
				const { gameId, playerSecret } = context.request.body

				await runWithRedis(async client => {
					const authed = await playerIsAuthedToGame(client, gameId, playerSecret)

					if (authed) {
						context.body = await startGame(client, gameId)
						return
					}

					context.body = {
						success: false,
					}
				})
			},
			'/api/stop-game': async context => {
				const { gameId, playerSecret } = context.request.body

				await runWithRedis(async client => {
					const authed = await playerIsAuthedToGame(client, gameId, playerSecret)

					if (authed) {
						await stopGame(client, gameId)
					}

					context.body = {
						success: authed,
					}
				})
			},
			'/api/create-player': async context => {
				await runWithRedis(async client => {
					const { playerId, playerSecret } = await createPlayer(client)

					success(context, {
						playerId,
						playerSecret,
					})
				})
			},
		},
	}, { set404: true }))

	app.listen(port)
}
