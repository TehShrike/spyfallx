# Contributing

If you're looking for an easy way to contribute, check out the [TODO list](./todo.md).

If you want to make a change that alters the gameplay, open an issue first so we can talk it over.

## To run locally

Install [DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html).  Extract it somewhere like `~/dynamodb_local_latest`

Run DynamoDB locally in some terminal tab and run the schema-creation script:

```sh
java -Djava.library.path=~/dynamodb_local_latest/DynamoDBLocal_lib -jar ~/dynamodb_local_latest/DynamoDBLocal.jar -sharedDb
npm run create-schema
```

Clone the repo, install, run:

```sh
git clone git@github.com:TehShrike/spyfallx.git
cd spyfallx
npm install
npm run dev
```

Then open `http://localhost:8888/` in your browser.

### To run the tests

There aren't a lot of tests, but hey, there are some.

```sh
npm install
npm test
```

# License

[WTFPL](http://wtfpl2.com)
