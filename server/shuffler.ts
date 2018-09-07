import shuffle from 'array-shuffle'

export default inputItems => {
	let shuffled = shuffle(inputItems)

	return () => {
		if (shuffled.length === 0) {
			shuffled = shuffle(inputItems)
		}

		return shuffled.pop()
	}
}
