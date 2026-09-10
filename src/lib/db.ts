import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

/**
 * Establishes a connection to MongoDB using a singleton pattern to prevent multiple connections.
 */
export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI; // moved into inside the function, check on call time, prevent CI error
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  if (cached.conn) return cached.conn;
  
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
