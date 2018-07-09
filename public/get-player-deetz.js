import { PLAYER_SECRET_KEY } from './constants.js'
import { futch, post } from './futch.js'

export default async() => {
	let playerSecret = localStorage.getItem(PLAYER_SECRET_KEY)

	if (playerSecret) {
		console.log(`found player secret`, playerSecret)
		const { authed, playerId } = await futch(`api/player-id/${ playerSecret }`)

		if (authed) {
			return {
				playerId,
				playerSecret,
			}
		}
	}

	const newPlayer = await createPlayer()
	const { playerId } = newPlayer
	playerSecret = newPlayer.playerSecret

	return {
		playerId,
		playerSecret,
	}
}

const createPlayer = async() => {
	const { playerId, playerSecret } = await post(`/api/create-player`)

	if (!playerSecret || !playerId) {
		throw new Error(`Didn't get player secret or id back from server.  id: ${ playerId }, secret: ${ playerSecret } }`)
	}

	localStorage.setItem(PLAYER_SECRET_KEY, playerSecret)
	return { playerId, playerSecret }
}
