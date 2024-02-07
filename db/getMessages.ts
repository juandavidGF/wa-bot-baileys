import clientPromise from './mongodb';

require('dotenv').config();

type ChatMessage = {
  role: string;
  message: string;
};

const getMessages = async (phone: undefined | string = undefined) => {
  if (!process.env.MONGO_DB) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }
	if (!process.env.MONGO_COLLECTION) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGO_DB);
    const collection = db.collection(process.env.MONGO_COLLECTION);
  
    const messages = phone
      ? await collection.find({ phone: phone}).toArray() 
      : await collection.find({}).toArray();
  
    console.log('messages: ', messages[0]);
    return messages[0];
  } catch (error) {
    console.error(error)
  }
}

export default getMessages
