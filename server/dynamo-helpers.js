const TYPE = require(`./dynamo-types.js`)

const swich = (value, map) => (map[value] || map.def)()

const oMap = (object, fn) => {
	const output = {}

	Object.entries(object).forEach(([ key, value ]) => {
		output[key] = fn(value)
	})

	return output
}

const serialize = (AttributeType, value) => swich(AttributeType, {
	[TYPE.NUMBER]: () => value.toString(),
	[TYPE.NUMBER_SET]: () => value.map(number => number.toString()),
	[TYPE.STRING]: () => value.toString(),
	[TYPE.MAP]: () => oMap(value, str => ({
		[TYPE.STRING]: str.toString(),
	})),
	def: () => value,
})

const deserialize = (AttributeType, value) => swich(AttributeType, {
	[TYPE.NUMBER]: () => parseFloat(value, 10),
	[TYPE.NUMBER_SET]: () => value.map(str => parseFloat(str, 10)),
	[TYPE.MAP]: () => oMap(value, object => object[TYPE.STRING]),
	def: () => value,
})

const dynamoFieldProperty = (field, value) => ({
	[field.AttributeName]: {
		[field.AttributeType]: serialize(field.AttributeType, value),
	},
})

const dynamoFieldObject = fieldValues => Object.assign(
	...fieldValues.map(({ field, value }) => dynamoFieldProperty(field, value))
)

const expressionValueName = AttributeName => `:` + AttributeName
const expressionNameName = AttributeName => `#` + AttributeName


const putItem = async(dynamoDb, { table, fieldValues }) => dynamoDb.putItem({
	TableName: table,
	Item: dynamoFieldObject(fieldValues),
}).promise()

const buildAttributeNameObject = fields => {
	const o = {}
	fields.forEach(({ AttributeName }) => {
		o[expressionNameName(AttributeName)] = AttributeName
	})
	return o
}

const buildUpdateWithValues = ({ table, key, fieldValues }) => ({
	TableName: table,
	Key: dynamoFieldProperty(key.field, key.value),
	ExpressionAttributeNames: buildAttributeNameObject(fieldValues.map(({ field }) => field)),
	ExpressionAttributeValues: dynamoFieldObject(
		fieldValues.map(({ field, value }) => ({
			field: Object.assign({}, field, { AttributeName: expressionValueName(field.AttributeName) }),
			value,
		}))
	),
})

const updateItem = async(dynamoDb, { table, key, fieldValues }) => dynamoDb.updateItem(
	Object.assign(
		buildUpdateWithValues({ table, key, fieldValues }),
		{
			UpdateExpression: `SET ` + fieldValues.map(
				({ field }) => `${ expressionNameName(field.AttributeName) } = ${ expressionValueName(field.AttributeName) }`
			).join(`, `),
		}
	)
).promise()

const getItem = async(dynamoDb, { tableName, key, resultFields }) => {
	const data = await dynamoDb.getItem({
		TableName: tableName,
		Key: dynamoFieldObject([ key ]),
		AttributesToGet: resultFields.map(({ AttributeName }) => AttributeName),
		ConsistentRead: true,
	}).promise()

	const item = data.Item

	if (!item) {
		return null
	}

	const output = {}

	resultFields.forEach(field => {
		output[field.AttributeName] = getField(item, field)
	})

	return output
}

const getField = (item, field) => item[field.AttributeName]
	? deserialize(field.AttributeType, item[field.AttributeName][field.AttributeType])
	: null




module.exports = {
	putItem,
	getItem,
	updateItem,
	buildUpdateWithValues,
	expressionNameName,
	expressionValueName,
	serialize,
	getField,
}
