import clientPromise from './mongodb';

require('dotenv').config();

export default async function getTasks() {
  if (!process.env.MONGO_DB) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }
	if (!process.env.MONGO_COLLECTION_TASKS) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGO_DB);
    const collection = db.collection(process.env.MONGO_COLLECTION_TASKS);
  
    const tasks = await collection.find({done: false}).toArray()
  
    console.log('tasks: ', tasks[0]);
    return tasks;
  } catch (error: any) {
    console.error(error)
    throw Error(`getTask error: ${error.message}`)
  }
}