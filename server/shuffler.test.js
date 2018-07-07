const test = require(`zora`)
const makeShuffler = require(`./shuffler.js`)

const roles = [ `a`, `b`, `c` ]
const rolesSet = new Set(roles)

test(`Every role must be one of the original input roles`, t => {
	const getNext = makeShuffler(roles)

	const output = [
		getNext(),
		getNext(),
		getNext(),
	]

	output.forEach(item => {
		t.ok(rolesSet.has(item))
	})
})

test(`Returns a different role each time it is called`, t => {
	const getNext = makeShuffler(roles)

	const output = [
		getNext(),
		getNext(),
		getNext(),
	]

	const outputSet = new Set(output)

	t.equal(outputSet.size, 3)
})

test(`Keeps returning items even if you call more times than items were put in`, t => {
	const getNext = makeShuffler(roles)

	const output = [
		getNext(),
		getNext(),
		getNext(),
		getNext(),
		getNext(),
	]

	output.forEach(item => {
		t.ok(rolesSet.has(item), `${ item }  must be one of the original input roles`)
	})

	const outputSet = new Set(output)

	t.equal(outputSet.size, 3)
})
