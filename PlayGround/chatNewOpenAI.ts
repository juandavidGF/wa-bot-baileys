import OpenAI from "openai";
import { delay } from "../utils/delay";
import { defaultPrompt } from "../lib/Prompts"
const readline = require('readline');
const fs = require('fs');

require('dotenv').config();

const openai = new OpenAI();

const C_ASSISTANT = false;


async function createAssistant(
  name="juand4bot",
  instructions="You are a personal math tutor. Write and run code to answer math questions.",
  ) {
  const assistant = await openai.beta.assistants.create({
    name,
    instructions: defaultPrompt().content,
    // tools: [{ type: "code_interpreter" }],
    model: "gpt-3.5-turbo-1106"
    // model: 'gpt-4-1106-preview'
  });
  return assistant;
}


async function main() {
  // create Assistant or call some
  const assistant = await createAssistant();
  const aId = assistant.id;
  // const aId = 'asst_lVQxnTkHr4ur5iJUCzs4pcro';
  // create Thread
  const thread = await openai.beta.threads.create();
  // const thread = {
  //   id: "thread_u6rQdszJSAQtJIQxyExXxASE"
  // }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {

      const message = await openai.beta.threads.messages.create(
        thread.id,
        {
          role: "user",
          content: input
        }
      );

      const run = await openai.beta.threads.runs.create(
        thread.id,
        {
          assistant_id: aId,
        }
      );

      console.log('run.status', run.id, run.status);

      let runRetrieve = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );

      console.log('run.status: ', run.status);
      console.log('runRetrieve.status: ', runRetrieve.status);

      do {
        await delay(500);
        runRetrieve = await openai.beta.threads.runs.retrieve(
          thread.id,
          run.id
        );
        console.log(runRetrieve.status);
        console.log('run.status: ', run.status);
        if(runRetrieve.status === 'failed') break;
      } while(runRetrieve.status !== 'completed');
      console.log('run.status after: ', run.status);

      const threadMessages = await openai.beta.threads.messages.list(
        thread.id
      );

      const messages = threadMessages.data.map(m => {
        if(m.content[0].type === 'text') {
          console.log(m.content)
          return {
            role: m.role,
            value: m.content[0].text.value
          }
        }
      });
      console.log('Assistant: ', messages[0]?.value)

      getUserInput();
    });
  };

  getUserInput();
}

function reaadLine() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const getUserInput = async () => {
    rl.question('You: ', async (input: string) => {
      
      getUserInput(); // Continue to listen for user input
    });
  };

  getUserInput(); // Start the conversation
}

main();