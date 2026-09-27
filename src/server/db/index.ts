import "server-only";
import { serverEnv } from "@/server/shared/config/env";
import mongoose from "mongoose";

// The check is moved inside connectDB() to prevent build-time static analysis errors

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
  const { MONGODB_URI } = serverEnv();
  if (cached.conn) return cached.conn;
  
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  try { cached.conn = await cached.promise; }
  catch (error) { cached.promise = null; throw error; }
  return cached.conn;
}
