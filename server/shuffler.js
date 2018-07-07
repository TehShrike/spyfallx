const shuffle = require(`array-shuffle`)

module.exports = inputItems => {
	let shuffled = shuffle(inputItems)

	return () => {
		if (shuffled.length === 0) {
			shuffled = shuffle(inputItems)
		}

		return shuffled.pop()
	}
}
