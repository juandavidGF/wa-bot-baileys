// import OpenAI from 'openai';
// import isDomainAvailable from './utils/isDomainAvailable';
// import clientPromise from './db/mongodb';
// import { getTasks } from './db/tasks';
// import { Campaign } from './models/tasks';
import summaryMemoryBuffer from '../langchainEx/summaryBufferMemory'
import entityMemory from '../langchainEx/entityMemory'
import summaryMongo from '../langchainEx/summaryMongo'
import getIndexes from './getIndexsDB'

require('dotenv').config();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// async function getDomain() {
//   let product = 'a generative AI brand'
//   let companyName = "genAI"
//   const domainCompletition = await openai.chat.completions.create({
//     messages: [{ role: 'user', content: `What is a good web domain for a company that makes: ${product}?, and name ${companyName}, just responde with the domain not add more text, 
//     and different than ` }],
//     model: 'gpt-3.5-turbo',
//   });
//   const domain = domainCompletition.choices[0].message.content
//   if(!domain) return
//   console.log(domain)
//   console.log(await isDomainAvailable(domain))
// }

// async function printItems() {
//   // domains: { domain: undefined, available: false },
//   const textAssets = {
//     companyName: 'Gag',
//     domains: "xdomain.com",
//     slogan: 'Laugh out loud!',
//     tagline: 'undefined',
//     logoPrompt: 'A colorful and playful logo representing humor and laughter.',
//     whyTheLogo: 'The company wants to convey a sense of fun and entertainment through its brand.'
//   };

//   for (const [key, value] of Object.entries(textAssets)) {
//     console.log(`${key}: ${value}`);
//   }
  
// }

// async function findPhoneDB() {
//   if (!process.env.MONGO_DB) {
//     throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
//   }
// 	if (!process.env.MONGO_COLLECTION) {
//     throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
//   }

//   const mongoClient = await clientPromise;
//   const db = mongoClient.db(process.env.MONGO_DB);
//   const collection = db.collection(process.env.MONGO_COLLECTION);

//   const JD_NUMBER = process.env.JD_NUMBER
//   const senderJid = `${JD_NUMBER}@s.whatsapp.net`
//   const phone = `+${senderJid.split('@')[0]}`;

//   const results = await collection.find({ phone: phone }).toArray()
//   console.log(results)
//   mongoClient.close();
// }
// async function handleTasks() {
//   interface ActiveCodes {
//     [key: string]: Campaign
//   }
  
//   const activeCodes: ActiveCodes = {};

//   const tasks = await getTasks();

//   const tasksP = tasks['phone'];

//   // tasks.code.forEach((camp, index) => {
//   //   console.log(index, camp);
//   //   if(!!camp.code?.id || !!camp.code) {
//   //     activeCodes[camp.code.id] = camp
//   //   }
//   // });

//   console.log('activeCodes', activeCodes);
// }

// getDomain()
// printItems()
// findPhoneDB()
// getTasks();
// handleTasks();

// memory();
// summaryMemory();
// summaryMemoryBuffer();

// summaryMongo();
getIndexes();