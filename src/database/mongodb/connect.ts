import mongoose from "mongoose";

const mongoDbUrl = process.env.MONGO_URI;

if (!mongoDbUrl) {
  throw new Error("Please define MONGO_URI in your .env file.");
}

const resolvedMongoDbUrl = mongoDbUrl;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalThis.mongooseCache = cached;

export async function connectDb() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(resolvedMongoDbUrl, {
      dbName: "MindaptixCRM",
      maxPoolSize: 20,
      minPoolSize: 5,
      maxIdleTimeMS: 45000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

export default connectDb;
