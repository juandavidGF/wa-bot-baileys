import clientPromise from './mongodb';

require('dotenv').config();

type ChatMessage = {
  role: string;
  message: string;
};

const getMessages = async (phone: undefined | string = undefined) => {
  if (!process.env.MONGO_DB_CMP) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }
	if (!process.env.MONGO_COLLECTION_CAI) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGO_DB_CMP);
    const collection = db.collection(process.env.MONGO_COLLECTION_CAI);
 
    console.log('flag1')
    const messages = phone
      ? await collection.find({ phone: phone}).toArray() 
      : await collection.find({}).toArray();
  
    console.log('flag2')

    console.log('messages: ', phone, messages[0]);
    return messages[0];
  } catch (error) {
    console.error(error)
  }
}

export default getMessages
