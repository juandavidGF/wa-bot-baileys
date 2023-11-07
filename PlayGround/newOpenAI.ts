import OpenAI from "openai";
const readline = require('readline');
const fs = require('fs');

require('dotenv').config();

const openai = new OpenAI();

async function createMathAssistant() {
  const myAssistant = await openai.beta.assistants.create({
    instructions:
      "You are a personal math tutor. When asked a question, write and run Python code to answer the question.",
    name: "Math Tutor",
    tools: [{ type: "code_interpreter" }],
    model: "gpt-4-1106-preview",
  });

  console.log(myAssistant);
}
const ASSISSTANT = 'asst_lVQxnTkHr4ur5iJUCzs4pcro';


async function modifyAssisstant() {
  const myUpdatedAssistant = await openai.beta.assistants.update(
    ASSISSTANT,
    {
      instructions:
        "You are a personal math tutor. When asked a question, write and run Python code to answer the question.",
      name: "Math Tutor 2",
      tools: [{ type: "code_interpreter" }],
      model: "gpt-4-1106-preview",
    }
  );

  console.log(myUpdatedAssistant);
}

async function retriveAssisstant() {
  const myAssistant = await openai.beta.assistants.retrieve(
    ASSISSTANT
  );

  console.log(myAssistant);
}

async function listAssistants() {
  const myAssistants = await openai.beta.assistants.list({
    order: 'desc',
    limit: 20,
  });

  console.log(myAssistants.data);
}

async function createThread() {
  // const emptyThread = await openai.beta.threads.create({});
  // console.log(emptyThread);
  // thread_H9UCYWPlbT7bYWnOHEROpceK

  // console.log(myThread);


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
// const THREAD = 'thread_H9UCYWPlbT7bYWnOHEROpceK';


async function modifyThread() {
  const updatedThread = await openai.beta.threads.update(
    THREAD,
    {
      metadata: { modified: "true", user: "juan" },
    }
  );

  console.log(updatedThread);
}

async function retrieveThread() {
  const myThread = await openai.beta.threads.retrieve(
    THREAD
  );

  console.log(myThread);
}


async function createMessage() {
  const threadMessages = await openai.beta.threads.messages.create(
    THREAD,
    { role: "user", content: "I need to solve the equation `3x + 11 = 14`. Can you help me?" }
  );

  console.log(threadMessages);
}
const MESSAGE = "msg_afuU5ose7LS1D8JxTuLqJ3qk";

async function retrieveMessage() {
  const message = await openai.beta.threads.messages.retrieve(
    THREAD,
    MESSAGE
  );

  // console.log(message);
  console.log(message.content[0]);
}

async function createRun() {
  const run = await openai.beta.threads.runs.create(
    THREAD,
    { assistant_id: ASSISSTANT }
  );

  console.log(run);
  // run_g4HWzpGBC9uGmBJkXkRO9ZlM
}
// let RUN = "run_g4HWzpGBC9uGmBJkXkRO9ZlM"

async function createThreadAndRun() {
  const run = await openai.beta.threads.createAndRun({
    assistant_id: ASSISSTANT,
    thread: {
      messages: [
        { role: "user", content: "can you please give me the solution for this equation: `x^2 - 5x + 6 = 0` "},
      ],
    },
  });

  console.log(run);
  // run_KvioDfcdyLfqhbeH0H34QUXQ
  // thread_bDAKSGWvo4VdjA7OKk0jhTkO
}
let RUN = "run_KvioDfcdyLfqhbeH0H34QUXQ";
let THREAD = "thread_bDAKSGWvo4VdjA7OKk0jhTkO"

async function retrieveRun() {
  const run = await openai.beta.threads.runs.retrieve(
    THREAD,
    RUN,
  );

  console.log(run);
}

async function listRuns() {
  const runs = await openai.beta.threads.runs.list(
    THREAD
  );

  console.log(runs);
}


async function listRunSteps() {
  const runStep = await openai.beta.threads.runs.steps.list(
    THREAD,
    RUN,
  );

  for(let i in runStep.data) {
    const stepDetail = runStep.data[i].step_details
    const type = stepDetail.type;
    if(type === 'tool_calls') {
      const toolCalls = stepDetail.tool_calls[0];
      if(toolCalls.type == 'code_interpreter') {
        // console.log(toolCalls);
        // call_CklfX0HVead9UyajqUrxc7Xy
        // console.log(toolCalls.code_interpreter.input);
        if(toolCalls.code_interpreter.outputs[0].type === 'logs') {
          console.log(toolCalls.code_interpreter.outputs[0].logs);
        }
      }
    }
  }
  
  // let ids = [];
  // ids = runStep.data.map(step => step.id)

  // const steps = await retrieveRunSteps(ids)
  // console.log('retrieveSteps', steps);
  // msg_OMkdkujrIZqXiPyrzs8NsiBd

  // const jsonData = JSON.stringify(runStep, null, 2);
  // const filePath = 'data.json';

  // fs.writeFile(filePath, jsonData, (err: any) => {
  //   if (err) {
  //     console.error('Error writing to file:', err);
  //   } else {
  //     console.log('Data has been written to the file successfully.');
  //   }
  // });
}

const retrieveRunSteps = async (ids: string[]) => {
  const promises = ids.map(async (id) => {
    const result = await openai.beta.threads.runs.steps.retrieve(THREAD, RUN, id);
    return result;
  });

  return Promise.all(promises);
};

listRunSteps();