export type DynamoDbTypeString = 'S' | 'N' | 'B' | 'M' | 'NS' | 'BOOL' | 'SS' | 'BS' | 'L' | 'NULL'

export const STRING: DynamoDbTypeString = `S`
export const NUMBER: DynamoDbTypeString = `N`
export const BINARY: DynamoDbTypeString = `B`
export const MAP: DynamoDbTypeString = `M`
export const NUMBER_SET: DynamoDbTypeString = `NS`
export const BOOLEAN: DynamoDbTypeString = `BOOL`
export const STRING_SET: DynamoDbTypeString = `SS`
export const BINARY_SET: DynamoDbTypeString = 'BS'
export const LIST: DynamoDbTypeString = 'L'
export const NULL: DynamoDbTypeString = 'NULL'

const TYPE = {
	STRING,
	NUMBER,
	BINARY,
	MAP,
	NUMBER_SET,
	BOOLEAN,
	STRING_SET,
	BINARY_SET,
	LIST,
	NULL,
}

export default TYPE
