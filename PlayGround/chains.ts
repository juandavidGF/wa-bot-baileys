import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, PromptTemplate, SystemMessagePromptTemplate } from "langchain/prompts";
import { ConversationChain, LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConversationSummaryBufferMemory, ConversationSummaryMemory } from "langchain/memory";
import { OpenAI } from "langchain/llms/openai";
import { delay } from "../utils/delay";
import { defaultPrompt } from '../lib/Prompts'
const readline = require('readline');

require('dotenv').config();

const run = async () => {
  const chatPromptMemory = new ConversationSummaryMemory({
    llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
  });
  const chatPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      "The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know."
    ),
    SystemMessagePromptTemplate.fromTemplate(
      defaultPrompt().content as string
    ),
    new MessagesPlaceholder("history"),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ]);
  
  const model = new ChatOpenAI({ temperature: 0.9, verbose: true });
  const chain = new ConversationChain({
    llm: model,
    memory: chatPromptMemory,
    prompt: chatPrompt,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Function to handle user input
  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      const lastMessage = input;
      const response = await chain.predict({ input: lastMessage });
      console.log('AI:', response);
      getUserInput(); // Continue to listen for user input
    });
  };

  getUserInput(); // Start the conversation
}

// We can also construct an LLMChain from a ChatPromptTemplate and a chat model.
const runMemoryLLM = async () => {
  const model = new OpenAI({ temperature: 0.9});
  const memory = new ConversationSummaryMemory({
    memoryKey: "chat_history",
    llm: new OpenAI({ modelName: "gpt-3.5-turbo", temperature: 0.9 }),
  });

  const prompt =
    PromptTemplate.fromTemplate(`The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.

    Current conversation:
    {chat_history}
    Human: {input}
    AI:`);

  const chain = new LLMChain({ 
    llm: model,
    prompt, 
    memory, 
    verbose: true 
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Function to handle user input
  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      const response = await chain.call({ input });
      console.log('AI:', response.text);
      getUserInput(); // Continue to listen for user input
    });
  };

  getUserInput(); // Start the conversation
}

const chaingB = async () => {
  const chat = new ChatOpenAI({ temperature: 0 });
  const chatPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a helpful assistant that translates {input_language} to {output_language}.",
    ],
    ["human", "{text}"],
  ]);
  const chainB = new LLMChain({
    prompt: chatPrompt,
    llm: chat,
  });
  
  const resB = await chainB.call({
    input_language: "English",
    output_language: "French",
    text: "I love programming.",
  });
  console.log({ resB });
}

export default run();