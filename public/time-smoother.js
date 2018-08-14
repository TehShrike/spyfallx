const INTERVAL = 500

export default cb => {
	let lastUpdateTimestamp = Date.now()
	let latestOfficialElapsedMs = 0
	let lastValueEmitted = 0

	const emitElapsed = () => {
		const msSinceLastUpdate = Date.now() - lastUpdateTimestamp
		const serverElapsed = latestOfficialElapsedMs + msSinceLastUpdate

		const elapsed = Math.max(serverElapsed, lastValueEmitted)

		lastValueEmitted = elapsed

		cb(elapsed)
	}

	const interval = setInterval(emitElapsed, INTERVAL)

	return {
		update(elapsedMs) {
			lastUpdateTimestamp = Date.now()
			latestOfficialElapsedMs = elapsedMs
			emitElapsed()
		},
		stop() {
			clearInterval(interval)
		},
		reset() {
			lastUpdateTimestamp = Date.now()
			latestOfficialElapsedMs = 0
			lastValueEmitted = 0
		},
	}
}
