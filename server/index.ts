// @ts-ignore
require(`hard-rejection/register`)
require(`loud-rejection/register`)

const Koa = require('koa')
const createRouter = require('koa-bestest-router')
const compress = require('koa-compress')
const conditionalGet = require('koa-conditional-get')
const etag = require('koa-etag')
const send = require('koa-send')
const koaBody = require('koa-body')

import dynamoDb from './dynamodb-instance'

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
	getGameChangeCounter,
	incrementGameChangeCounter,
} = require(`./game.js`)

startServer(process.env.PORT || 8888)

const runWithDynamo = async fn => {
	await fn(dynamoDb)
}

const success = (context, body = {}) => context.body = Object.assign({
	success: true,
}, body)

const gameNotFound = context => {
	context.status = 404
	context.body = {
		success: false,
		message: `Game not found`,
	}
}

function startServer(port) {
	const app = new Koa()

	app.use(compress())
	app.use(conditionalGet())
	app.use(etag())
	app.use(koaBody())

	app.use(async(context, next) => {
		context.headers[`content-type`] = `application/json`
		await next()
	})

	app.use(async(context, next) => {
		try {
			await next()
		} catch (err) {
			if (!err.known) {
				console.error(`error:`, context.method, context.url)
				console.error(err)
			}

			context.status = err.status || 500
			context.body = {
				success: false,
				message: err && err.message,
			}
		}
	})

	app.use(createRouter({
		GET: {
			'/robots.txt': async context => {
				context.body = process.env.UP_STAGE === 'production' ? '' : `User-agent: *\nDisallow: /\n`
			},
			'/build/:path(.+)': async context => {
				await send(context, context.params.path, { root: buildPath })
			},
			'/api/game/:gameId/player/:playerSecret': async context => {
				const { gameId, playerSecret } = context.params

				await runWithDynamo(async client => {
					success(context, await getPlayerGameInformation(client, gameId, playerSecret))
				})
			},
			'/api/game/:gameId/:changeCounter(\\d+)': async context => {
				const { gameId, changeCounter: changeCounterString } = context.params
				const changeCounter = parseInt(changeCounterString, 10)

				await runWithDynamo(async client => {
					const currentChangeCounter = await getGameChangeCounter(dynamoDb, gameId)

					if (currentChangeCounter === null) {
						gameNotFound(context)
					} else if (currentChangeCounter === changeCounter) {
						success(context, {
							changed: false,
						})
					} else {
						const game = await getGameInformation(client, gameId)
						if (game) {
							success(context, Object.assign(game, {
								changed: true,
							}))
						} else {
							gameNotFound(context)
						}
					}
				})
			},
			'/api/player-id/:playerSecret': async context => {
				const { playerSecret } = context.params

				await runWithDynamo(async client => {
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
				const { name, playerSecret, gameId } = context.request.body

				await runWithDynamo(async client => {
					await setPlayerNameWithPlayerSecret(client, playerSecret, name)

					if (gameId) {
						await incrementGameChangeCounter(client, gameId)
					}

					success(context)
				})
			},
			'/api/create': async context => {
				const { playerSecret } = context.request.body
				await runWithDynamo(async client => {
					const gameId = await createGame(client, playerSecret)

					success(context, {
						gameId,
					})
				})
			},
			'/api/join-game': async context => {
				const { gameId, playerSecret } = context.request.body

				await runWithDynamo(async client => {
					await addPlayerToGame(client, gameId, playerSecret)

					success(context)
				})
			},
			'/api/remove-from-game': async context => {
				const { gameId, playerId } = context.request.body

				await runWithDynamo(async client => {
					await removePlayerFromGame(client, gameId, playerId)

					success(context)
				})
			},
			'/api/start-game': async context => {
				const { gameId, playerSecret } = context.request.body

				await runWithDynamo(async client => {
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
			'/api/restart': async context => {
				const { gameId, playerSecret } = context.request.body

				await runWithDynamo(async client => {
					const authed = await playerIsAuthedToGame(client, gameId, playerSecret)

					if (authed) {
						await stopGame(client, gameId)
						context.body = await startGame(client, gameId)
						return
					}

					context.body = {
						success: false,
					}
				})
			},
			'/api/create-player': async context => {
				await runWithDynamo(async client => {
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
