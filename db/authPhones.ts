import clientPromise from './mongodb';

require('dotenv').config();

type allowedPhones = {
	name: string;
	phone: string;
	credits?: number;
	sent?: boolean;
	date?: number;
}

const authPhones = async () => {
  if (!process.env.MONGO_DB_CMP) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }
	if (!process.env.MONGO_COLLECTION_AP) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }

  function isValidPhone(phone: any): phone is allowedPhones {
    return 'name' in phone && 'phone' in phone;
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGO_DB_CMP);
    const collection = db.collection(process.env.MONGO_COLLECTION_AP);
 
    
    const documents = await collection.find({}).toArray();
    console.log('authPhones -> ', documents);
    const authPhones: allowedPhones[] = documents.filter(isValidPhone) as unknown as allowedPhones[];
    
    return authPhones;
  } catch (error) {
    console.error(error)
  }
}

export default authPhones
