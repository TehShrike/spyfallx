export default element => async promise => {
	try {
		return await promise
	} catch (err) {
		if (err.json) {
			err.json().then(responseBody => {
				element.innerText = responseBody.message || responseBody
			})
		} else {
			element.innerText = err.message || err.toString()
		}

		document.body.dataset.error = true

		throw err
	}
}
