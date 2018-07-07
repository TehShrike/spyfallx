require(`loud-rejection/register`)

const { promisify } = require(`util`)
const Koa = require(`koa`)
const createRouter = require(`koa-bestest-router`)
const compress = require(`koa-compress`)
const conditionalGet = require(`koa-conditional-get`)
const etag = require(`koa-etag`)
const send = require(`koa-send`)
const redis = require(`redis`)
const reandom = require(`reandom`)
const locations = require(`../shared/locations.js`)
const Die = require(`gamblers-dice`)

const relative = path => require(`path`).join(__dirname, path)
const staticPath = relative(`../public/static`)
const buildPath = relative(`../public/build`)
const publicPath = relative(`../public`)

startServer(process.env.PORT || 8888)

const getRedis = () => redis.createClient({
	host: `localhost`,
	port: 6379,
})

const SEED_NUMBER_SEPARATOR = ` `

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
	{secret} = role
game:active:{gameId}
*/

const playerNameKey = playerId => `player:name:${ playerId }`
const playerIdKey = playerSecret => `player:id:${ playerSecret }`
const gamePlayersKey = gameId => `game:players:${ gameId }`
const gameRolesKey = gameId => `game:roles:${ gameId }`
const gameActiveKey = gameId => `game:active:${ gameId }`
const gameLocationSeed = gameId => `game:location-seed:${ gameId }`
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

const saveSpyIndex = async(client, gameId, seedArray) => {
	const seedString = seedArray.join(SEED_NUMBER_SEPARATOR)
	await client.set(gameSpySeed(gameId), seedString)
}

async function startGame(client, gameId) {
	const [ playerIds, locationIndex ] = await Promise.all([
		client.smembers(gamePlayersKey(gameId)),
		getRandomIndexUsingSeed(client, gameLocationSeed(gameId), locations.length),
	])

	if (playerIds.length < 3) {
		return `You can't start a game with less than three players`
	}

	const [ spyIndex ] = await Promise.all([
		getRandomIndexUsingSeed(client, gameSpySeed(gameId), playerIds.length),
		client.set(gameActiveKey(gameId), `1`),
	])

	const location = locations[locationIndex]

	const roleShuffler = location.roles

	// shuffle the roles list and use it to assign roles to everyone who isn't the spy
	// better write a test for that

	return {
		spyIndex,
		locationIndex,
		playerIds,
	}
}



function startServer(port) {
	const app = new Koa()

	app.use(compress())
	app.use(conditionalGet())
	app.use(etag())

	app.use(createRouter({
		GET: {
			'/static/:path(.+)': async context => {
				await send(context, context.params.path, { root: staticPath })
			},
			'/build/:path(.+)': async context => {
				await send(context, context.params.path, { root: buildPath })
			},
			'/api/create': async context => {

			},
			'/(.*)': async context => {
				await send(context, `index.html`, { root: publicPath })
			},
		},
	}, { set404: true }))

	app.listen(port)
}
