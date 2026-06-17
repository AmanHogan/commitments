import mongoose, { type Mongoose } from "mongoose";

const MONGODB_URI: string | undefined = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not set. Add it to .env.local (see .env.example).",
  );
}

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
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI as string, {
      bufferCommands: false,
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
