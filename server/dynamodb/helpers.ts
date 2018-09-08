import TYPE, { DynamoDbTypeString } from './types'

const swich = (value, map) => (map[value] || map.def)()

const oMap = (object, fn) => {
	const output = {}

	Object.entries(object).forEach(([ key, value ]) => {
		output[key] = fn(value)
	})

	return output
}

type JsValue = string | object | number | Array<any>

export const serialize = (AttributeType, value): JsValue => swich(AttributeType, {
	[TYPE.NUMBER]: () => value.toString(),
	[TYPE.NUMBER_SET]: () => value.map(number => number.toString()),
	[TYPE.STRING]: () => value.toString(),
	[TYPE.MAP]: () => oMap(value, str => ({
		[TYPE.STRING]: str.toString(),
	})),
	def: () => value,
})

const deserialize = (AttributeType, value) => swich(AttributeType, {
	[TYPE.NUMBER]: () => parseFloat(value),
	[TYPE.NUMBER_SET]: () => value.map(str => parseFloat(str)),
	[TYPE.MAP]: () => oMap(value, object => object[TYPE.STRING]),
	def: () => value,
})

type DynamoValue = {
	[x in DynamoDbTypeString]: JsValue
}

type DynamoFieldProperty = {
	[x in string]: DynamoValue
}

const dynamoFieldProperty = (field: Field, value: JsValue): DynamoFieldProperty => {
	// wtf typescript?  This should all be legit
	// @ts-ignore
	const valuez: DynamoValue = {
		[field.AttributeType]: serialize(field.AttributeType, value),
	}

	return {
		[field.AttributeName]: valuez,
	}
}

interface FieldValue {
	field: Field,
	value: any
}

type FieldValues = [FieldValue, ...FieldValue[]]
const dynamoFieldObject = (fieldValues: FieldValues) => {
	const fieldProperties = fieldValues.map(({ field, value }) => dynamoFieldProperty(field, value))

	// @ts-ignore
	return Object.assign(...fieldProperties)
}

export const expressionValueName = AttributeName => `:` + AttributeName
export const expressionNameName = AttributeName => `#` + AttributeName

export const putItem = async(dynamoDb, { table, fieldValues }: { table: string, fieldValues: FieldValues }) => dynamoDb.putItem({
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

export const buildUpdateWithValues = ({ table, key, fieldValues }) => ({
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

export const makeSimpleExpression = (operation, ...fields) => operation + fields.map(
	field => expressionNameName(field.AttributeName) + ` ` + expressionValueName(field.AttributeName)
).join(`, `)

export const makeSetExpression = (...fields) => `SET ` + fields.map(field => `${ expressionNameName(field.AttributeName) } = ${ expressionValueName(field.AttributeName) }`).join(`, `)

export const updateItem = async(dynamoDb, { table, key, fieldValues, expression }) => {
	try {
		return await dynamoDb.updateItem(
			Object.assign(
				buildUpdateWithValues({ table, key, fieldValues }),
				{
					UpdateExpression: expression,
				}
			)
		).promise()
	} catch (e) {
		console.error(`Error ${ e.message }`, { table, key, fieldValues, expression })
		throw e
	}
}

export const updateItemWithSet = async(dynamoDb, { table, key, fieldValues }) => updateItem(dynamoDb, {
	table,
	key,
	fieldValues,
	expression: makeSetExpression(...fieldValues.map(({ field }) => field)),
})

export const getItem = async(dynamoDb, { tableName, key, resultFields }) => {
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

export interface Field {
	AttributeName: string,
	AttributeType: DynamoDbTypeString,
}

export const getField = (item: object, field: Field) => item[field.AttributeName]
	? deserialize(field.AttributeType, item[field.AttributeName][field.AttributeType])
	: null

export const makeFieldObject = (name: string, type: DynamoDbTypeString): Field => ({
	AttributeName: name,
	AttributeType: type,
})
