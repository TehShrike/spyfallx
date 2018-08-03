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

const relative = path => require(`path`).join(__dirname, path)
const buildPath = relative(`../public/build`)
const publicPath = relative(`../public`)

const {
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
} = require(`./game.js`)

startServer(process.env.PORT || 8888)

const deployedToAws = !!process.env.UP_STAGE
const redisHost = deployedToAws ? `spyfall-db.l8ndwu.0001.use1.cache.amazonaws.com` : `localhost`

const getRedis = () => new Redis({
	host: redisHost,
	port: 6379,
})


const connectOrThrow = () => new Promise((resolve, reject) => {
	const client = getRedis()

	client.on(`connect`, () => resolve(client))
	client.on(`error`, e => reject(e))
})

const runWithRedis = async fn => {
	const client = await connectOrThrow()

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

	app.use(async(context, next) => {
		try {
			await next()
		} catch (err) {
			context.status = err.status || 500
			context.body = {
				success: false,
				message: err && err.message,
			}
		}
	})

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
					const game = await getGameInformation(client, gameId)

					if (game) {
						success(context, game)
					} else {
						context.status = 404
						context.body = {
							success: false,
							message: `Game not found`,
						}
					}
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
