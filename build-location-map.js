function build(filename) {
	const locations = require(`./shared/${ filename }`)

	const map = locations.reduce((map, { name, roles }) => {
		map[name] = {
			name,
			roles,
		}
		return map
	}, Object.create(null))

	const output = `export default ${ JSON.stringify(map) }`

	require(`fs`).writeFileSync(`./public/build/${ filename }`, output)
}

build(`locations.js`)
build(`locations2.js`)
