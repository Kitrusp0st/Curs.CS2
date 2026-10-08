import * as schema from './schema.ts';

// Cloud SQL is disabled per configuration; local persistent store is used in queries.ts
export const db = {
  schema,
};

