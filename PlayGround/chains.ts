import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, PromptTemplate, SystemMessagePromptTemplate } from "langchain/prompts";
import { ConversationChain, LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BufferWindowMemory, ConversationSummaryBufferMemory, ConversationSummaryMemory, ENTITY_MEMORY_CONVERSATION_TEMPLATE, EntityMemory } from "langchain/memory";
import { OpenAI } from "langchain/llms/openai";
import { delay } from "../utils/delay";
import { defaultPrompt } from '../lib/Prompts'
import { createBot, firstMessage} from '../lib/Prompts'
const readline = require('readline');

require('dotenv').config();


async function bufferMemory() {
  const chat = new ChatOpenAI({ temperature: 0 });

  const chatPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      createBot().content as string,
    ],
    [
      "assistant",
      firstMessage().content as string
    ],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
  ]);

  const chain = new ConversationChain({
    memory: new BufferMemory({ returnMessages: true, memoryKey: "history" }),
    prompt: chatPrompt,
    llm: chat,
    verbose: true,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('AI:', firstMessage().content);

  // Function to handle user input
  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      const response = await chain.call({ input });
      console.log('AI:', response);
      getUserInput(); // Continue to listen for user input
    });
  };

  getUserInput(); // Start the conversation
}


async function conversationBufferMemoryWindow() {
  const chat = new ChatOpenAI({ temperature: 0 });

  const chatPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      createBot().content as string,
    ],
    [
      "assistant",
      firstMessage().content as string
    ],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
  ]);

  const memory = new BufferWindowMemory({ returnMessages: true, memoryKey: "history", k: 1, });

  const chain = new ConversationChain({
    memory: memory,
    prompt: chatPrompt,
    llm: chat,
    verbose: true,
  });


  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('AI:', firstMessage().content);

  // Function to handle user input
  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      const response = await chain.call({ input });
      console.log('AI:', response);
      getUserInput(); // Continue to listen for user input
    });
  };

  getUserInput(); // Start the conversation
}


const conversationSummaryMemory = async () => {
  const chatPromptMemory = new ConversationSummaryMemory({
    llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
  });
  const chatPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      createBot().content as string
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
const conversationSummaryMemory2 = async () => {
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

async function llmChain() {
  const chatPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a helpful assistant that translates {input_language} to {output_language}.",
    ],
    ["human", "{text}"],
  ]);
  
  const chat = new ChatOpenAI({ temperature: 0 });

  const chain = new LLMChain({
    prompt: chatPrompt,
    llm: chat,
  });
  
  const resB = await chain.call({
    input_language: "English",
    output_language: "French",
    text: "I love programming.",
  });
  console.log({ resB });
}

const conversationChain = async () => {}

const promptTemplate = async () => {
  const oneInputPrompt = new PromptTemplate({
    inputVariables: ["area", "style"],
    template: "you are a helpful assistnat in {area} area, and thalk in {style} style"
  })

  const formattedOneInputPrompt = await oneInputPrompt.format({
    area: "Artificial Intelligence",
    style: "x Style"
  });
  
  console.log(formattedOneInputPrompt);


  const template = "Tell me a {adjective} joke about {content}.";

  const promptTemplate = PromptTemplate.fromTemplate(template);
  console.log(promptTemplate.inputVariables);
  // ['adjective', 'content']
  const formattedPromptTemplate = await promptTemplate.format({
    adjective: "funny",
    content: "chickens",
  });
  console.log(formattedPromptTemplate);
}
const chatPromptTemplate = async () => {
  // const systemTemplate = "You are a helpful assistant that translates {input_language} to {output_language}.";
  // const humanTemplate = "{text}";

  // const chatPrompt = ChatPromptTemplate.fromMessages([
  //   ["system", systemTemplate],
  //   ["human", humanTemplate],
  // ]);

  // // Format the messages
  // const formattedChatPrompt = await chatPrompt.formatMessages({
  //   input_language: "English",
  //   output_language: "French",
  //   text: "I love programming.",
  // });

  // console.log(formattedChatPrompt);
  
  // const chatPrompt = ChatPromptTemplate.fromMessages([
  //   SystemMessagePromptTemplate.fromTemplate(
  //     createBot().content as string
  //   ),
  //   new MessagesPlaceholder("history"),
  //   HumanMessagePromptTemplate.fromTemplate("{input}"),
  // ]);

  // const formattedChatPrompt = await chatPrompt.formatMessages({
  //   history: "this is a history",
  //   input: "hola",
  // })
  // console.log(formattedChatPrompt);

  const template = "You are a helpful assistant that translates {input_language} to {output_language}.";
  const systemMessagePrompt = SystemMessagePromptTemplate.fromTemplate(template);
  const humanTemplate = "{text}";
  const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromMessages([
    ["system","this is just a experiment"],
    systemMessagePrompt,
    new MessagesPlaceholder("history"),
    humanMessagePrompt,
  ]);

  const formattedChatPrompt = await chatPrompt.formatMessages({
    input_language: "english",
    output_language: "french",
    history: "this is a history",
    text: "hola",
  })
  console.log(formattedChatPrompt);
}

const chatAndPromptTemplate = async () => {
  const template = "Tell me a {adjective} joke about {content}.";
  const promptTemplate = PromptTemplate.fromTemplate(template);
  console.log(promptTemplate.inputVariables);
  // ['adjective', 'content']
  const formattedPromptTemplate = await promptTemplate.format({
    adjective: "funny",
    content: "chickens",
  });
  console.log(formattedPromptTemplate);

  const chatPrompt = ChatPromptTemplate.fromMessages<{
    input_language: string,
    output_language: string,
    history: string,
    text: string
  }>([
    ["system","this is just a experiment"],
    ["system","this is just a experiment {input_language}, {output_language}, {history}"],
    formattedPromptTemplate,
    new MessagesPlaceholder("history"),
    ["assistant", "text"]
  ]);

  const formattedChatPrompt = await chatPrompt.formatMessages({
    input_language: "english",
    output_language: "french",
    history: "this is a history",
    text: "hola",
  })
  console.log(formattedChatPrompt);
}

const typeChatPrompt = async () => {
  const template = "You are a helpful assistant that translates {input_language} to {output_language}.";
  const systemMessagePrompt = SystemMessagePromptTemplate.fromTemplate(template);
  const humanTemplate = "{text}";
  const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromMessages<{
    input_language: string,
    output_language: string,
    text: string
  }>([
    ["system", "this is a system message"],
    systemMessagePrompt,
    humanMessagePrompt
  ])

  const formattedChatPrompt = await chatPrompt.formatMessages({
    input_language: "english",
    output_language: "french",
    text: "hola",
  })
  console.log(formattedChatPrompt);  
}

import {
  BufferMemory,
  CombinedMemory,
} from "langchain/memory";

const combinedMemory = async () => {
  // buffer memory
  const bufferMemory = new BufferWindowMemory({
    memoryKey: "chat_history_lines",
    inputKey: "input",
    k: 2
  });

  // summary memory
  const summaryMemory = new ConversationSummaryMemory({
    llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
    inputKey: "input",
    memoryKey: "conversation_summary",
  });

  const memory = new CombinedMemory({
    memories: [bufferMemory, summaryMemory],
  });

  const _DEFAULT_TEMPLATE = `
  The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.

  System instructions:
  ${createBot().content}

  Summary of conversation:
  {conversation_summary}
  Current conversation:
  {chat_history_lines}
  Human: {input}
  AI:`;

  const PROMPT = new PromptTemplate({
    inputVariables: ["input", "conversation_summary", "chat_history_lines"],
    template: _DEFAULT_TEMPLATE,
  });
  const model = new ChatOpenAI({ temperature: 0.9, verbose: true });
  const chain = new ConversationChain({ llm: model, memory, prompt: PROMPT });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Function to handle user input
  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      const lastMessage = input;
      const response = await chain.call({ input: lastMessage });
      console.log('AI:', response);
      getUserInput(); // Continue to listen for user input
    });
  };

  getUserInput(); // Start the conversation
}

const combinedMemoryEntity = async () => {
  // buffer memory
  const bufferMemory = new BufferWindowMemory({
    memoryKey: "chat_history_lines",
    inputKey: "input",
    k: 3
  });

  // summary memory
  const summaryMemory = new ConversationSummaryMemory({
    llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
    inputKey: "input",
    memoryKey: "conversation_summary",
  });

  const entityMemory = new EntityMemory({
    llm: new OpenAI({ temperature: 0 }),
    chatHistoryKey: "history", // Default value
    entitiesKey: "entities", // Default value
  });

  const memory = new CombinedMemory({
    memories: [summaryMemory, entityMemory],
  });

  const _DEFAULT_TEMPLATE = `
  System instructions:
  ${createBot().content}

  Summary of conversation:
  {conversation_summary}
  Current conversation:
  {chat_history_lines}
  {history}
  {entities}
  Human: {input}
  AI:`;

  const PROMPT = new PromptTemplate({
    inputVariables: ["input", "conversation_summary", "chat_history_lines", "history", "entities"],
    template: _DEFAULT_TEMPLATE,
  });

  const model = new ChatOpenAI({ temperature: 0.9, verbose: true });
  const chain = new ConversationChain({ llm: model, memory, prompt: PROMPT });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Function to handle user input
  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      const lastMessage = input;
      const response = await chain.call({ input: lastMessage });
      console.log('AI:', response);
      getUserInput(); // Continue to listen for user input
    });
  };
}

const entityMemory = async () => {
  const memory = new EntityMemory({
    llm: new OpenAI({ temperature: 0 }),
    chatHistoryKey: "history", // Default value
    entitiesKey: "entities", // Default value
    k: 3,
  });
  const model = new OpenAI({ temperature: 0.9 });
  const chain = new LLMChain({
    llm: model,
    prompt: ENTITY_MEMORY_CONVERSATION_TEMPLATE, // Default prompt - must include the set chatHistoryKey and entitiesKey as input variables.
    memory,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Function to handle user input
  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      const response = await chain.call({ input: input });
      console.log({
        chatHistory: await memory.chatHistory.getMessages(),
        memory: await memory.loadMemoryVariables({ input: "Who is Jim?" }),
        response,
      });
      getUserInput(); // Continue to listen for user input
    });
  };

  getUserInput(); // Start the conversation
}


export default combinedMemory();