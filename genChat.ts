import OpenAI from 'openai';
import isDomainAvailable from './utils/isDomainAvailable';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import clientPromise from './db/mongodb';
import { delay } from './utils/delay';

require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MessageDB {
	role: 'system' | 'assistant' | 'user',
	date: number,
	sequence?: number,
	message: string,
	env: 'dev' | 'prod',
	campaign?: string,
	threadId?: string,
	assistantId?: string,
}

type RequestPayload = {
  chain: string;
  prompt: any;
};

interface Message {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

type RequestPayloadChat = {
  chain: string;
  messages: Message[];
};

export async function genChat(
	payload: any,
	phone: number,
	chain: null = null,
	threadId: string | undefined = undefined,
	assistantId: string | undefined = undefined) {
	console.log('/gChat flag1');
	let response: any = '';
	switch (payload.chain) {
		case "logoChain":
			response = await getOneByOne(payload, phone);
			break;
		case "jobTaskPhone":
			response = await generateN(
				payload.messages, 
				phone, 
				chain, 
				threadId, 
				assistantId
			);
			break;
		case "jobTaskCode":
			response = await generateN(
				payload.messages, 
				phone, 
				chain, 
				threadId, 
				assistantId
			);
			break;
		case "jobTaskSys":
			response = await generate(
				payload.messages, 
				phone
			);
			break;
		case "default":
			response = await generateN(
				payload.messages, 
				phone, 
				chain, 
				threadId, 
				assistantId
			);
			break;
		default:
			throw new Error('chain not supported');
	}

	// const response = mockTextAssets()
  // getByFunctionCalling(payload)
  return response;
}

async function createMessage(threadId: string | undefined, role: 'user' = 'user', message: string) {
	if(!threadId) throw Error('createMessage genChat, thread got undefinated');
	const threadMessages = await openai.beta.threads.messages.create(
		threadId,
		{ role: role, content: message }
	);

	return threadMessages;
}

function timeout(ms: number, promise: Promise<any>) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("Timeout after " + ms + " ms")); // Lanza un error después del tiempo especificado
    }, ms);

    promise.then(resolve).catch(reject);
  });
}

async function generateN(
	messages:  ChatCompletionMessageParam[], 
	phone: number, 
	chain: any = null,
	threadId: string | undefined,
	assistantId: string | undefined
) {
	// if(payload.userInput !== 'string') throw Error('getChat userInput not string' + ' ' + typeof payload.userInput);
	// console.log('getMVPRecluiment#messagess: ', messages);
	console.log('/gCN generate flag2');
	// if running return or queu
	let lastMessage = messages[messages.length - 1]?.content as string;
	if(!lastMessage) throw Error('err last Message, !LastMesssage');
	await saveConversation('user', lastMessage, phone, threadId , assistantId);

	try {
		console.log('/gCN before chain.call generate flag2', lastMessage);
		// addMesage
		const newMessage = await createMessage(threadId, 'user', lastMessage);
		// console.log('newMessage')
		// run
		if(!threadId || !assistantId ) throw Error('createMessage genChat, threadId or assistantId got undefinated');
		const run = await openai.beta.threads.runs.create(
			threadId,
			{ assistant_id: assistantId }
		);
		console.log('runId: ', run.id, run.status);
		// retrieve

		let runRetrieve: any;

		do {
			try {
				runRetrieve = await timeout(120_000,openai.beta.threads.runs.retrieve(
					threadId,
					run.id
				));
			} catch (error:any) {
				console.error("genChat runs.retrieve Error or timeout occurred:", error.message);
				throw Error('genChat runs.retrieve Error or timeout occurred:');
			}
			console.log('runRetrieve.status: ', runRetrieve.status);
			if(runRetrieve.status === 'failed') {
				throw Error('runRetrieve failed');
			}
			await delay(500);
		} while(runRetrieve.status !== 'completed');

		const threadMessages = await openai.beta.threads.messages.list(
			threadId
		);

		const messages = threadMessages.data.map(m => {
			if(m.content[0].type === 'text') {
				// console.log('m.content', m.content)
				return {
					role: m.role,
					value: m.content[0].text.value
				}
			}
		});
		console.log('Assistant: ', messages[0]?.value);

		let gptResponse = messages[0]?.value;
		// let gptResponse = await getGPTNew();
		// let gptResponse =  await chain.predict({ input: lastMessage });
		// console.log('/genChat gptResponse: ', gptResponse);
		// const gptResponse = (await openai.chat.completions.create({
		// 	messages: messages,
		// 	model: 'gpt-3.5-turbo',
		// })).choices[0].message.content;
		if(gptResponse == null) {
			throw Error('We didnt get a response getMVPRecluiment');
		}
	
		// error.code "context_length_exceeded" task de resumir. Y no parar proceso, solo decir err si alcaso.
		// O utilizar otro modelo más grande.
	
		await saveConversation('assistant', gptResponse, phone, threadId, assistantId);
		return { gptResponse };
	} catch (error: any) {
		console.log('/genChat generate() error: ', error.message);
		throw Error(error.message);
	}
}

async function generate(messages:  ChatCompletionMessageParam[], phone: number, chain: any = null) {
	// if(payload.userInput !== 'string') throw Error('getChat userInput not string' + ' ' + typeof payload.userInput);
	// console.log('getMVPRecluiment#messagess: ', messages);
	console.log('/gC generate flag2');
	let lastMessage = messages[messages.length - 1]?.content as string;
	if(!lastMessage) throw Error('err last Message, !LastMesssage');
	await saveConversation('user', lastMessage, phone);

	try {
		console.log('/gC before chain.call generate flag2', lastMessage);
		// let gptResponse = await getGPTNew();
		// let gptResponse =  await chain.predict({ input: lastMessage });
		// console.log('/genChat gptResponse: ', gptResponse);
		const gptResponse = (await openai.chat.completions.create({
			messages: messages,
			model: 'gpt-3.5-turbo',
		})).choices[0].message.content;
		if(gptResponse == null) {
			throw Error('We didnt get a response getMVPRecluiment');
		}
	
		// error.code "context_length_exceeded" task de resumir. Y no parar proceso, solo decir err si alcaso.
		// O utilizar otro modelo más grande.
	
		await saveConversation('assistant', gptResponse, phone);
		return { gptResponse };
	} catch (error: any) {
		console.log('/genChat generate() error: ', error.message);
	}
}

export async function getGPTNew() {
	const assistant = await openai.beta.assistants.create({
		instructions: "",
		model: "gpt-4-1106-preview",
	});
}

export async function saveConversation(role: 'user' | 'assistant' | 'system', 
	message: string, 
	phone: number, 
	threadId: string | undefined = undefined, 
	assistantId: string | undefined = undefined
) {
	if (!process.env.MONGO_DB_CMP) {
		throw new Error('Invalid environment variable: "MONGO_DB_CMP"');
	}
	if (!process.env.MONGO_COLLECTION_CAI) {
		throw new Error('Invalid environment variable: "MONGO_COLLECTION_TASKS"');
	}

	const mongoClient = await clientPromise;
	const db = mongoClient.db(process.env.MONGO_DB_CMP);
	const collection = db.collection(process.env.MONGO_COLLECTION_CAI);

	const messageData: MessageDB = {
		date: Date.now(),
		role,
		message,
		assistantId,
		threadId,
		env: process.env.ENV_J4 as "dev" || "prod",
	}
	try {
		await collection.updateOne(
			{ pohne: phone },
			{
				$push: {
					chat: messageData
				},
				$setOnInsert: {
					phone: phone // This sets the 'phone' field when a new document is created
				},
			},
			{ upsert: true}
		)
	} catch (error: any) {
		console.error(error)
		throw Error(`saveConversation error ${error.message}`)
	}
}

function mockTextAssets() {
	return {
		companyName: 'GenesiAI',
		domain: 'genesiAI.com',
		slogan: '"Empowering Creative Identities with GenesiAI."',
		tagline: '"Spark Your Creative Identity with GenesiAI"',
		logoPrompt: "Prompt: Create a unique and captivating icon that symbolizes GenesiAI's generative AI brand identity. The icon should embody the concept of sparking creativity and innovation. Incorporate elements of a lightning bolt to represent the spark, a polygonal shape to signify the AI aspect, and a vibrant color palette to reflect energy and excitement. Ensure the icon is symmetrical and centered, with a dark gradient background for depth. Place the lightning bolt towards the top of the polygonal shape, with intricate details and sharp focus. The overall style should be minimalistic, futuristic, and trending in the design community.",
		whyLogo: "The icon composition was chosen to visually represent GenesiAI's generative AI brand identity, incorporating elements of a lightning bolt, polygonal shape, vibrant colors, and a minimalistic, futuristic style to reflect energy, innovation, and trending design aesthetics."
	}
}

async function  getOneByOne({chain, prompt}: RequestPayload, phone: number) {

  const companyName = (await openai.chat.completions.create({
    messages: [{ role: 'user', content: `What is a good name for a company that makes: ${prompt.product}?, just responde with the company name and not add more text` }],
    model: 'gpt-3.5-turbo',
  })).choices[0].message.content;

  let domains = [];
  let domain: string | undefined = undefined;

  for(let i = 0; i < 3; i++) {
    const domainCompletition = (await openai.chat.completions.create({
      messages: [{ role: 'user', content: `What is a good web domain for a company that makes: ${prompt.product}?, and name ${companyName}, just responde with the domain and not add more text` }],
      model: 'gpt-3.5-turbo',
    })).choices[0].message.content;
    if(!domainCompletition) throw new Error('domain content isnt string');
    domains.push({
      domain: domainCompletition,
      available: await isDomainAvailable(domainCompletition)
    });
    if(domains[i].available) {
      domain = domains[i].domain
      break
    };
  }

  const tagline = (await openai.chat.completions.create({
    messages: [{ role: 'user', content: `Suggest a tagline for a company that makes: ${prompt.product}?, company name: ${companyName}, 
    and web Doman: ${domain}, just responde with one tagline and not add more text or explanation` }],
    model: 'gpt-3.5-turbo',
  })).choices[0].message.content;

  const slogan = (await openai.chat.completions.create({
    messages: [{ role: 'user', content: `Suggest a slogan for a company that makes: ${prompt.product}?, company name: ${companyName}, 
    and web Doman: ${domain}, tagline: ${tagline}, just responde with the slogan and not add more text` }],
    model: 'gpt-3.5-turbo',
  })).choices[0].message.content;

  const logoPrompt  = (await openai.chat.completions.create({
    messages: [{ role: 'user', content: `take this examples of prompts for dall-e to create nice icon/logs:

    1. Modern startup logo with no text, symmetrical, minimalistic, speed flash fast grocery delivery icon, centered, gradient, dark background.
    2. appicon style, Create a minimalistic and modern logo for a blog post titled 'Maximizing Efficiency as an Indie Entrepreneur: Time Management and Prioritization Tips'. 
    The logo should represent the concepts of time management, productivity, and entrepreneurship., flat icon
    3. a tech company new logo, minimalistic, geometric, futuristic, stable diffusion, trending on artstation, sharp focus, studio photo, 
    intricate details, highly detailed, by greg rutkowski.
    4. A cute blue baby birdie, logo in a dark circle as the background, vibrant, adorable, bubbles, cheerful.
    5. A slanting rectangle shape in red and black minimal logo in dark circle as the background, vibrant, 3d isomorphic.
    
    Now try to combine the features for the company: ${companyName}, product: ${prompt.product}, tagline: ${tagline}, web domain: ${domain}, to reflect the brand, and
    Create a short Prompt to generate an icon fewer than 20 words based on an imaginary combined analogy concept like some object, animal, or geometry figure. Specify the form, background, 
    elements, shapes, features, style, colors, location of each element, symmetry, and do not use the company name or product name..
    ` }],
    model: 'gpt-3.5-turbo',
  })).choices[0].message.content;

  const whyLogo  = (await openai.chat.completions.create({
    messages: [{ role: 'user', content: `product: -> response: [${prompt.product}],
    company: ${companyName},
    web domain: ${domain},
    tagline: ${tagline},
    icon composition: ${logoPrompt},

    Based in the last information,

    think step by step, and Identify the language used for the product, and use thas language to respond me why the icon composition was choosen, not add more text, just use max 20 words,
    describe why the shapes, colors, composition.
    `}],
    model: 'gpt-3.5-turbo',
  })).choices[0].message.content;

  return {
    companyName,
    domains: domain,
    slogan,
    tagline,
    logoPrompt,
    whyLogo
  }
}

async function getByFunctionCalling({chain, prompt}: RequestPayload) {
  let content;

	switch (chain) {
		case "design_brief":
			content = `can you suggest the identity brand assets for a company with this product?:
			"${prompt.product}?"`
			break;
		default:
			throw new Error('chain not supported');
	}
  const functions = [
		{
			name: "getIdentityBrandAssets",
			description: "Get the identity brand assets for the product description",
			parameters: {
				type: "object",
				properties: {
					companyName: {
						type: "string",
						description: "The name of the company",
					},
					domain: {
						type: "string",
						description: "the web domain of the company"
					},
					slogan: {
						type: "string",
						description: "the slogan for the company"
					},
					tagline: {
						type: "string",
						description: "the tagline for the company"
					},
					logoPrompt: {
						type: "string",
						description: "the logo prompt to generate using LLMs like Dall-e"
					},
					whyTheLogo: {
						type: "string",
						description: "the reason because the logo was selected"
					}
				},
				required: ["companyName", "domain1", "domain2", "domain3", "slogan", "logoPrompt", "whyTheLogo"],
			},
		},
		// {
		// 	name: "getDomain",
		// 	description: "get the different domain for the company",
		// 	parameters: {
		// 		type: "object",
		// 		properties: {
					
		// 		}

		// 	}
		// }
	];
  try {
		const response = await openai.chat.completions.create({
      // model: "gpt-3.5-turbo",
			model: "gpt-3.5-turbo-0613",
			messages: [{
        role: 'user',
        content: content
      }],
			functions: functions,
			function_call: "auto"
		});

    // console.log('response.choices', response.choices)
	
		let responseMessage = response.choices[0].message;
	
		// console.log('responseMessage: ', responseMessage);
	
		if (responseMessage?.function_call) {
			let function_name = responseMessage.function_call.name;
			let functionArgs;
			if (responseMessage.function_call && responseMessage.function_call.arguments) {
				functionArgs = JSON.parse(responseMessage.function_call.arguments);
			}
			let functionResponse;
	
			switch (function_name) {
				case 'getIdentityBrandAssets':
					functionResponse = await getIdentityBrandAssets(
						functionArgs.companyName,
						functionArgs.domain,
						functionArgs.slogan,
						functionArgs.tagline,
						functionArgs.logoPrompt,
						functionArgs.whyTheLogo
					);
					break;
				default:
					throw new Error(`Function not implemented: ${function_name}`);
			}
	
			// console.log('genChat#functionResponse: ', functionResponse);

      // si no tiene todos los párametros error
      if(Object.values(functionResponse).some(value => value === undefined)) {
        throw new Error(`undefindated values: ${function_name}`);
      }
			
			return functionResponse
		} else {
			throw new Error(`Function call not implemented: ${responseMessage?.function_call}`);
		}
	} catch (error: any) {
		console.log('/genChat err: ', error);
		return { message: error.message, type: "Internal server error" }
	}
}

async function getIdentityBrandAssets(
	companyName: string,
	domain: string,
	slogan: string,
	tagline: string,
	logoPrompt: string,
	whyTheLogo: string
): Promise<any> {
	const designBrief = {
		companyName: companyName,
		domains: {
      domain: domain,
      available: await isDomainAvailable(domain)
    },
		slogan: slogan,
		tagline: tagline,
		logoPrompt: logoPrompt,
		whyTheLogo: whyTheLogo
	}

	return designBrief;
}