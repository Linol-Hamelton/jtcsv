# GraphQL upload integration
Current version: 3.1.0

## Problem
Accept CSV uploads via a GraphQL mutation and return parsed rows.

## Schema and resolver (Apollo Server)
```js
const { ApolloServer, gql } = require('apollo-server');
const { GraphQLUpload } = require('graphql-upload');
const { csvToJson } = require('jtcsv');

const typeDefs = gql`
  scalar Upload

  type CsvRow {
    id: String
    name: String
  }

  type Query {
    health: String
  }

  type Mutation {
    uploadCsv(file: Upload!): [CsvRow!]!
  }
`;

const resolvers = {
  Upload: GraphQLUpload,
  Query: { health: () => 'ok' },
  Mutation: {
    uploadCsv: async (_parent, { file }) => {
      try {
        if (!file) {
          throw new Error('File missing');
        }
        const { createReadStream } = await file;
        const stream = createReadStream();
        let csv = '';
        for await (const chunk of stream) {
          csv += chunk.toString();
        }
        return csvToJson(csv, { delimiter: ',', hasHeaders: true });
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Upload failed');
      }
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen().then(({ url }) => console.log(`Server ready at ${url}`));
```

## Common pitfalls
- Use `graphql-upload` or your framework's upload middleware.
- For large files, stream to disk and process asynchronously.

## Testing
- Use GraphQL Playground or Apollo Studio to upload a CSV file.
