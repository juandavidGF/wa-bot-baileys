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
import { createBot, firstMessage } from "../lib/Prompts";
import { Serialized } from "langchain/dist/load/serializable";
import { LLMResult } from "langchain/dist/schema";

require('dotenv').config();

const readline = require('readline');

async function run() {
  const chatPromptMemory = new ConversationSummaryBufferMemory({
    llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
    maxTokenLimit: 40,
    returnMessages: true,
  });
  
  const chatPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      createBot().content as string,
    ),
    [
      "assistant",
      firstMessage().content as string
    ],
    new MessagesPlaceholder("history"),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ]);

  const model = new ChatOpenAI({ temperature: 0.9, verbose: true, callbacks: [
    {
      handleLLMStart: async (llm: Serialized, prompts: string[]) => {
        console.log(JSON.stringify(llm, null, 2));
        console.log(JSON.stringify(prompts, null, 2));
      },
      handleLLMEnd: async (output: LLMResult) => {
        console.log(JSON.stringify(output, null, 2));
      },
      handleLLMError: async (err: Error) => {
        console.error(err);
      },
    },
  ], });
  const chain = new ConversationChain({
    llm: model,
    memory: chatPromptMemory,
    prompt: chatPrompt,
    callbacks: [
      {
        handleLLMStart: async (llm: Serialized, prompts: string[]) => {
          console.log(JSON.stringify(llm, null, 2));
          console.log(JSON.stringify(prompts, null, 2));
        },
        handleLLMEnd: async (output: LLMResult) => {
          console.log(JSON.stringify(output, null, 2));
        },
        handleLLMError: async (err: Error) => {
          console.error(err);
        },
      },
    ],
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let k = 0;

  console.log('AI:', firstMessage().content);

  // Function to handle user input
  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      console.log('k ->', k);
      if(k > 4) {
        console.log('k > 4')
        chatPromptMemory.prune();
        k = 0;
      }
      const response = await chain.predict({ input });
      console.log('AI:', response);
      // console.log('getNumTokensFromMessages', model.getNumTokensFromMessages)
      // console.log('chain -> ', chain);
      // console.log('chain. -> ', chain.lc_kwargs);
      // console.log('chain.prompt -> ', chain.prompt);
      // console.log('chain.memory -> ', chain.memory);
      // console.log('chain.llm -> ', chain.llm);
      // console.log('chain -> ', chain.memory);
      k++;
      getUserInput(); // Continue to listen for user input
    });
  };

  getUserInput(); // Start the conversation
}

run();
