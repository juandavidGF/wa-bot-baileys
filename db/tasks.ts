import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';
import { Task, Tasks, Campaign } from '../models/tasks';

require('dotenv').config();

export async function getTasks() {
  if (!process.env.MONGO_DB_CMP) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }
	if (!process.env.MONGO_COLLECTION_TASKS) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGO_DB_CMP);
    const collection = db.collection(process.env.MONGO_COLLECTION_TASKS);
  
    // const tasks = await collection.find({}).toArray();
    const allDocuments = await collection.find({}).toArray();

    const tasks = allDocuments.map(camp => {
      if(!camp.done) {
        return camp as unknown as Campaign;
      }
    }).filter(Boolean);

    console.log('tasks: ', tasks);

    return tasks;
  } catch (error: any) {
    console.error(error);
    throw Error(`getTask error: ${error.message}`);
  }
}

export async function updateTask(task: Campaign, phone: number) {
  if (!process.env.MONGO_DB_CMP) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }
	if (!process.env.MONGO_COLLECTION_TASKS) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGO_DB_CMP);
    const collection = db.collection(process.env.MONGO_COLLECTION_TASKS);

    console.log('updateTask task', task);
    console.log('updateTask task.id', task._id);

    
    const updateResult = await collection.updateOne(
      { _id: task._id },
      { $set: { done: true, doneDate: Date.now() }}
    );
  
    if (updateResult.matchedCount === 1) {
      // Update was successful
      console.log(`Campaign with _id ${task._id} updated successfully.`);
    } else {
      // No matching document found
      console.log(`No campaign found with _id ${task._id}.`);
    }

    // Check the update result
    console.log('Update Task Result:', updateResult);

    if (updateResult.modifiedCount > 0) {
      console.log('Updated the first matching document.');
    } else {
      console.log('No documents were updated.');
    }
  } catch (error: any) {
    console.error('error updateTask: ', error.message);
    throw Error('err updateTask');
  } 
}