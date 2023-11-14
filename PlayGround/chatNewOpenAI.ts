import OpenAI from "openai";
import { delay } from "../utils/delay";
const readline = require('readline');
const fs = require('fs');

require('dotenv').config();

const openai = new OpenAI();

const C_ASSISTANT = false;


async function createAssistant(
  name="Math Tutor", 
  instructions="You are a personal math tutor. Write and run code to answer math questions.",
  ) {
  const assistant = await openai.beta.assistants.create({
    name,
    instructions,
    tools: [{ type: "code_interpreter" }],
    model: "gpt-4-1106-preview"
  });
  return assistant;
}


async function main() {
  // create Assistant or call some
  // const assistant = await createAssistant();
  // const aId = assistant.id;
  const aId = 'asst_lVQxnTkHr4ur5iJUCzs4pcro';
  // create Thread
  // const thread = await openai.beta.threads.create();
  const thread = {
    id: "thread_u6rQdszJSAQtJIQxyExXxASE"
  }
  

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

      let runRetrieve = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );
      

      do {
        await delay(500);
        runRetrieve = await openai.beta.threads.runs.retrieve(
          thread.id,
          run.id
        );
      } while(runRetrieve.status !== 'completed');

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