export default message => {
	const err = new Error(message)

	err.known = true
	err.status = 400

	throw err
}
