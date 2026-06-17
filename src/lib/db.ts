import mongoose, { type Mongoose } from "mongoose";

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Cache the connection across HMR reloads in development and across serverless
// invocations, so we never open more than one pool per process.
const globalForMongoose = globalThis as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose._mongooseCache ?? {
  conn: null,
  promise: null,
};
globalForMongoose._mongooseCache = cache;

/**
 * Connect to MongoDB using a cached connection, creating one if necessary.
 * Safe to call on every request — concurrent callers share one in-flight promise.
 * @returns The connected Mongoose instance.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  if (cache.conn) {
    return cache.conn;
  }
  // Read (and validate) the URI lazily — only when a connection is actually
  // needed at runtime. Reading it at module scope would throw during
  // `next build` page-data collection, where no DB connection is required.
  const mongoUri: string | undefined = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (see .env.example).",
    );
  }
  if (!cache.promise) {
    cache.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
