import { MongoClient } from 'mongodb';

require('dotenv').config();

const uri = process.env.MONGODB_URI_VERCEL;

if (!uri) {
  throw new Error('Invalid environment variable: "MONGODB_URI"');
}

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error('Please add your Mongo URI to .env.local');
}

client = new MongoClient(uri, options);
clientPromise = client.connect();

console.log('Just Connected - mongodb');

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise as Promise<MongoClient>;
