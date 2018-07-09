const locations = require(`./shared/locations.js`)

const map = locations.reduce((map, { name, roles }) => {
	map[name] = {
		name,
		roles,
	}
	return map
}, Object.create(null))

const output = `export default ${ JSON.stringify(map) }`

require(`fs`).writeFileSync(`./public/build/locations.js`, output)
