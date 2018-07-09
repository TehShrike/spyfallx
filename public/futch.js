export const futch = async(url, options = {}) => {
	const headers = new Headers()
	headers.append(`content-type`, `application/json`)

	if (options.headers) {
		Object.keys(options.headers).forEach(header => {
			headers.append(header, options.headers[header])
		})
	}

	const response = await fetch(url, {
		method: options.method || `GET`,
		body: options.body && JSON.stringify(options.body),
		headers,
	})

	if (response.status < 200 || response.status >= 400) {
		throw new Error(`Server returned status ${ response.status }`)
	}

	return response.json()
}

export const post = (url, body = {}) => futch(url, { method: `POST`, body })
