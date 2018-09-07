import * as TYPE from './dynamodb/types.js'
import { makeFieldObject as field } from './dynamodb/helpers'

export const playerSecret = {
	secret: field(`secret`, TYPE.STRING),
	playerId: field(`playerId`, TYPE.STRING),
	ttl: field(`ttl`, TYPE.NUMBER),
}

export const player = {
	id: field(`id`, TYPE.STRING),
	secret: field(`secret`, TYPE.STRING),
	name: field(`name`, TYPE.STRING),
	ttl: field(`ttl`, TYPE.NUMBER),
}

export const game = {
	id: field(`id`, TYPE.STRING),
	playerIds: field(`playerIds`, TYPE.STRING_SET),
	playerIdsAssignedRoles: field(`playerIdsAssignedRoles`, TYPE.STRING_SET),
	roles: field(`roles`, TYPE.MAP),
	active: field(`active`, TYPE.BOOLEAN),
	locationSeed: field(`locationSeed`, TYPE.STRING),
	location: field(`location`, TYPE.STRING),
	spySeed: field(`spySeed`, TYPE.STRING),
	firstPlayerId: field(`firstPlayerId`, TYPE.STRING),
	startTimestamp: field(`startTimestamp`, TYPE.NUMBER),
	changeCounter: field(`changeCounter`, TYPE.NUMBER),
	ttl: field(`ttl`, TYPE.NUMBER),
	creatorPlayerId: field(`creatorPlayerId`, TYPE.STRING),
}
