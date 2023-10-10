import isDomainAvailable from './utils/isDomainAvailable';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import clientPromise from './db/mongodb';


import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

require('dotenv').config();

interface MessageDB {
	role: 'system' | 'assistant' | 'user',
	date: number,
	sequence?: number,
	message: string,
	env: 'dev' | 'prod',
	campaign?: string,
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


export async function genChat(payload: any, phone: number) {
	let response: any = ''
	switch (payload.chain) {
		case "logoChain":
			response = await getOneByOne(payload, phone);
			break;
		case "jobTaskPhone":
			response = await generate(payload.messages, phone);
			break;
		case "jobTaskCode":
			response = await generate(payload.messages, phone);
			break;
		case "jobTaskSys":
			response = await generate(payload.messages, phone);
			break;
		case "default":
			response = await generate(payload.messages, phone);
			break;
		default:
			throw new Error('chain not supported');
	}
  return response
}

async function generate(messages:  ChatCompletionMessageParam[], phone: number) {
  const memory = new ConversationSummaryBufferMemory({
    llm: new OpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
    maxTokenLimit: 10,
  });


}

async function  getOneByOne({chain, prompt}: RequestPayload, phone: number) {
  return {
    companyName: 'default',
    domains: 'default',
    slogan: 'default',
    tagline: 'default',
    logoPrompt: 'default',
    whyLogo: 'default'
  }
}