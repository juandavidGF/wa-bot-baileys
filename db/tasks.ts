import { ObjectId, WithId } from 'mongodb';
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

    const campaigns = {
      phone: [] as Campaign[],
      code: [] as Campaign[],
    };
  
    // const tasks = await collection.find({}).toArray();
    const allDocuments = await collection.find({}).toArray() as Campaign[];

    // Acá deería traer las que estan activas, así a x número se le haya enviado,
    // Si tiene código activo entonces igual las trea.
    // Acá podría filtrarlas, las que son por número, o por código, o por las dos

    allDocuments.forEach((camp) => {
      const vLast = camp.versions.length - 1;
      const lVersion = camp.versions[vLast]
      const lCamp: Campaign = {
        _id: camp._id,
        uuid: camp.uuid,
        email: camp.email,
        versions: [camp.versions[vLast]],
      }
      const phoneActive = lVersion.phone && !lVersion.done
      const codeActive = !!lVersion.code && lVersion.code.active
      if (phoneActive && codeActive) {
        campaigns.phone.push(lCamp);
        campaigns.code.push(lCamp);
      } else if (phoneActive) {
        campaigns.phone.push(lCamp);
      } else if (codeActive) {
        campaigns.code.push(lCamp);
      }
    });
    
    console.log(campaigns);

    return campaigns;
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

    const lastVersion = task.versions[task.versions.length - 1];
    lastVersion.done = true;
    lastVersion.doneDate = Date.now();

    const result = await collection.updateOne(
      { _id: task._id },
      { $set: { versions: task.versions } },
      { upsert: true }
    );

    if (result.modifiedCount === 1) {
      console.log('Last version updated successfully.');
    } else {
      console.log('No document matched the filter or the update did not modify any documents.');
    }

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