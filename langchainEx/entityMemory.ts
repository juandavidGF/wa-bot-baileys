import { OpenAI } from "langchain/llms/openai";
import {
  EntityMemory,
  ENTITY_MEMORY_CONVERSATION_TEMPLATE,
  ENTITY_SUMMARIZATION_PROMPT
} from "langchain/memory";
import { LLMChain } from "langchain/chains";
import { createBot } from '../lib/Prompts';
import { PromptTemplate } from "langchain/prompts";
const readline = require('readline');

require('dotenv').config();

const run = async () => {
  const instructionPrompt = PromptTemplate.fromTemplate(createBot().content as string)
  const memory = new EntityMemory({
    llm: new OpenAI({ temperature: 0 }),
    chatHistoryKey: "history", // Default value
    entitiesKey: "entities", // Default value
    entitySummarizationPrompt: instructionPrompt
  });
  const model = new OpenAI({ temperature: 0.9 });
  const chain = new LLMChain({
    llm: model,
    prompt: ENTITY_SUMMARIZATION_PROMPT, // Default prompt - must include the set chatHistoryKey and entitiesKey as input variables.
    memory,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      const response = await chain.call({ input });
      console.log('AI:', response.text);
      console.log({
        response,
        chatHistory: await memory.chatHistory,
        memory: await memory.loadMemoryVariables({ input: "Who is Jim?" }),
      });
      getUserInput(); // Continue to listen for user input
    });
  };

  getUserInput(); // Start the conversation
};

run();
