export interface KnownError extends Error {
	known: boolean,
	status: number,
}

export default message => {
	const err = new Error(message) as KnownError

	err.known = true
	err.status = 400

	throw err
}
