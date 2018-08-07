const TYPE = {
	STRING: `S`,
	NUMBER: `N`,
	BINARY: `B`,
	MAP: `M`,
	NUMBER_SET: `NS`,
	BOOLEAN: `BOOL`,
}

const field = (name, type) => ({
	AttributeName: name,
	AttributeType: type,
})

const playerSecret = {
	secret: field(`secret`, TYPE.STRING),
	playerId: field(`playerId`, TYPE.STRING),
}

const player = {
	id: field(`id`, TYPE.STRING),
	secret: field(`secret`, TYPE.STRING),
	name: field(`name`, TYPE.STRING),
	ttl: field(`ttl`, TYPE.NUMBER),
}

const game = {
	id: field(`id`, TYPE.STRING),
	playerIds: field(`playerIds`, TYPE.NUMBER_SET),
	roles: field(`roles`, TYPE.MAP),
	active: field(`active`, TYPE.BOOLEAN),
	locationSeed: field(`locationSeed`, TYPE.STRING),
	location: field(`location`, TYPE.STRING),
	spy_seed: field(`spy_seed`, TYPE.STRING),
	firstPlayerId: field(`firstPlayerId`, TYPE.NUMBER),
	startTimestamp: field(`startTimestamp`, TYPE.STRING),
	ttl: field(`ttl`, TYPE.NUMBER),
}

module.exports = {
	playerSecret,
	player,
	game,
}
