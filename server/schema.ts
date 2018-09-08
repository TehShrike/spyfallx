import * as TYPE from './dynamodb/types'
import { makeFieldObject as field, Field } from './dynamodb/helpers'

type TableSchema = {
	[x: string]: Field
}

export interface PlayerSecret {
	secret: string
	playerId: string
	ttl: number
}

export const playerSecret: TableSchema = {
	secret: field(`secret`, TYPE.STRING),
	playerId: field(`playerId`, TYPE.STRING),
	ttl: field(`ttl`, TYPE.NUMBER),
}

export interface Player {
	id: string
	secret: string
	name: string
	ttl: number
}

export const player: TableSchema = {
	id: field(`id`, TYPE.STRING),
	secret: field(`secret`, TYPE.STRING),
	name: field(`name`, TYPE.STRING),
	ttl: field(`ttl`, TYPE.NUMBER),
}

type Roles = {
	[x: string]: string
}
export interface Game {
	id: string
	playerIds: string[]
	playerIdsAssignedRoles: string[]
	roles: Roles
	active: boolean
	locationSeed: string
	location: string
	spySeed: string
	firstPlayerId: string
	startTimestamp: number
	changeCounter: number
	ttl: number
	creatorPlayerId: string
}

export const game: TableSchema = {
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
