import makeWASocket, {
  DisconnectReason,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  MessageType } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import logger from "./utils/logger";
import { delay } from "./utils/delay";
import { defaultPrompt, firstMessage } from "./lib/Prompts";

import { genChat, saveConversation } from './genChat';
import getLogo from './getLogo';
import getMessage from './db/getMessages';
import saveGenerations from './db/saveGenerations';
import { DesighBrief } from "./models/logoapp";
import { ChatCompletionMessageParam } from "openai/resources/chat";

import { AIMessagePromptTemplate, PromptTemplate } from "langchain/prompts";

import { getTasks, updateTask } from './db/tasks';
import { Campaign, Version, allowedPhones } from "./models/tasks";

import { LLMChain } from "langchain/chains";

// import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConversationChain } from "langchain/chains";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import OpenAI from "openai";

require('dotenv').config();

const openai = new OpenAI();

import { BaseMemory, ConversationSummaryBufferMemory, ConversationSummaryMemory } from "langchain/memory";
import { AIMessage } from "langchain/dist/schema";

const model = new ChatOpenAI({ temperature: 0.9, verbose: true });

interface chainHistoryInterface {
  [key: string]: ConversationSummaryBufferMemory | null; // Key is a string, value is an array of Message objects
}
const chatPromptMemory = {} as chainHistoryInterface;

interface chainMessages {
  [key: string]: ConversationChain | null; // Key is a string, value is an array of Message objects
}
const chainHistory: chainMessages = {} as chainMessages;

require('dotenv').config();

const JUAND4BOT_NUMBER = process.env.JUAND4BOT_NUMBER;
const JD_NUMBER = process.env.JD_NUMBER;
const OWNER_NUMBER = JUAND4BOT_NUMBER;
const AUTH_BAILEYS = OWNER_NUMBER === JD_NUMBER ? 'baileys_auth_info_juanG' : 'baileys_auth_info_juand4bot';
// const MVP_RECLUIMENT_CLIENT = process.env.MVP_RECLUIMENT_CLIENT;
const MVP_RECLUIMENT_CLIENT = JUAND4BOT_NUMBER;
const respondedToMessages = new Set();
const BASE_GEN = process.env.BASE_GEN;


// Quizá también debería agregar una para la app en la que esta, así le doy una prioridad.
interface SenderFlowState {
  flow: string;
  state: string;
  skill?: string,
  source?: string;
  campaign?: any;
  thread?: any;
  assistantId?: any;
  credits?: number;
}

interface SenderFlows {
  [senderJid: string]: SenderFlowState;
}

interface ActiveCodes {
  [key: string]: Campaign
}

const activeCodes: ActiveCodes = {};

const senderFlows: SenderFlows = {};

interface Messages {
  [key: string]: ChatCompletionMessageParam[]; // Key is a string, value is an array of Message objects
}
const mHistory: Messages = {};

type RequestPayload = {
  chain: string;
  prompt?: any;
};

type RequestPayloadChat = {
  chain: string;
  messages: ChatCompletionMessageParam[];
};

type textAssets = {
  companyName: string | null,
  domain: string | undefined,
  slogan: string | null,
  tagline: string | null,
  logoPrompt: string | null,
  whyLogo: string | null
}


const DEFAULT_FLOW = false

const SLAVA_PHONE: string = '41791093602'
const HAROLD_PHONE: string = '573208666258'
const JDIEGOHZ_PHONE: string = '573013847948'

const authPhones: allowedPhones[] = [
  { phone: OWNER_NUMBER === JD_NUMBER ? JUAND4BOT_NUMBER as string : JD_NUMBER as string },
  { phone: SLAVA_PHONE },
  { phone: HAROLD_PHONE, credits: 20 },
  { phone: JDIEGOHZ_PHONE, credits: 20 }
]

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_BAILEYS);
  logger.level = 'trace';
  
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });
  
  sock.ev.on("creds.update", saveCreds);

  const interval = 3*60*1_000 //10m

  const tasks = await getTasks();
  const tasksP = tasks['phone'];

  tasks.code.forEach(camp => {
    //  acá no devuelve todas?, o solo la última?.
    const version = camp.versions[0];
    if(!!version.code?.name) {
      // console.log(JSON.stringify(camp))
      activeCodes[version.code.name] = camp
    }
  });

  // Debería acá llamar las task para llenar una variable con las de código también.
  // De modo que las de código las revise primero cuando recibe un mensaje,
    // Y según si tiene phone, las filtre y ejecute.
  // setTimeout(() => jobTasksPhone(tasksP), 3_000);

  setInterval(async () => {
    const newTasks = await getTasks();
    newTasks.code.forEach(camp => {
      const version = camp.versions[0];
      if(!!version.code?.name) {
        activeCodes[version.code.name] = camp
      }
    });
    // jobTasksPhone(newTasks['phone']);
  }, interval);

  // Guardar cuando fue completado la task, luego puedo ver en que punto (como por ejemplo luego del #DONE#).
  // No mandó el #Done#, así que debo revisar que pasó, y como mejorarlo.
  // Quizá las campañas deberían crearse independientemente, para permitir una a muchas ... :).
  // Debo revisar según el date, si es default mandarlo, si no a pasado aún esperar :).

  async function initCHistory(prompts: any, senderJidLocal: string) {
    chatPromptMemory[senderJidLocal] = new ConversationSummaryBufferMemory({
      llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
      maxTokenLimit: 10,
    });


    const sysPrompt = prompts.map((p: any) => {
      if(p.role === 'system') return SystemMessagePromptTemplate.fromTemplate(p.content);
      else if(p.role === 'assistant') return AIMessagePromptTemplate.fromTemplate(p.content);
      else console.log('err, no role initCHistory');
    });

    const initPrompts = [
      ...sysPrompt,
      new MessagesPlaceholder("history"),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
    ]

    const chatPrompt = ChatPromptTemplate.fromMessages(initPrompts);
    
    const chain = new ConversationChain({
      llm: model,
      memory: chatPromptMemory[senderJidLocal] as ConversationSummaryBufferMemory,
      prompt: chatPrompt,
    });

    chainHistory[senderJidLocal] = chain;
  }

  async function createAssistant(
    instruction: string,
    name: string = "newAssistant", 
    campaign: Campaign | null = null, 
    model: "gpt-4-1106-preview" | "gpt-3.5-turbo-1106" = "gpt-4-1106-preview"
  ): Promise<string> {
    // assistant exist?
    if(campaign?.assistantId) {
      return campaign.assistantId;
    }
    const myAssistant = await openai.beta.assistants.create({
      instructions: instruction,
      name: name,
      model: model,
    });

    return myAssistant.id;
  }

  async function createThread() {
    const emptyThread = await openai.beta.threads.create();
    return emptyThread;
  }

  async function createMessage(thread: string, role: 'user' | 'assistant' = 'user', message: string) {
    const threadMessages = await openai.beta.threads.messages.create(
      thread,
      { role: role as any, content: message }
    );
    
    return threadMessages;
  }
  
  // Y acá no se supone que debe solo ejecutar una ??
  async function jobTasksPhone (tasksP: Campaign[]) {
    if (!!tasksP && tasksP.length > 0) {
      for(const taskVs of tasksP) {
        const task = taskVs.versions[0]
        // Acá debo ver cuáles son los únicos que estan habilitados.
        // Revisar lógica, una es enviar a los números definidos en la campaña?, y luego a cierta cantidad por vez para evitar?.
        if(!!task && !!task?.phone && authPhones.some(item => Number(item.phone) == task.phone)) {
          console.log('onjobTask for..of', task);
          const firstTask = task;
          const senderJidLocal = `${task?.phone}@s.whatsapp.net`;
          senderFlows[senderJidLocal] = {
            flow: 'jobTaskPhone',
            state: 'generating'
          };
          
          respondedToMessages.add(senderJidLocal);
          const firstMessageR = task.firstMessage as string;
          await sock.sendMessage(senderJidLocal, {
            text: firstMessageR,
          });
          senderFlows[senderJidLocal].state = 'firstMessage';
          mHistory[senderJidLocal] = []
          mHistory[senderJidLocal] = [
            {role: 'system', content: task.prompt as string},
            {role: 'assistant', content: task.firstMessage as string}
          ];

          // await initCHistory([
          //   {role: 'system', content: task.prompt as string},
          //   {role: 'assistant', content: task.firstMessage as string}
          // ], senderJidLocal)

          saveConversation('system', task.prompt as string, Number(task.phone));
          saveConversation('assistant', task.firstMessage as string, Number(task.phone));
          await updateTask(taskVs, Number(task.phone));

          const myAssistantId = await createAssistant(task.prompt, task.name, taskVs);
          senderFlows[senderJidLocal].assistantId = myAssistantId;

          const thread = await createThread();
          senderFlows[senderJidLocal].thread = thread;

          // const messsage = await createMessage(thread.id, 'assistant', task.firstMessage as string);

          await delay(1_500);
          senderFlows[senderJidLocal].state = 'init';
          respondedToMessages.delete(senderJidLocal);
        }
      }
    }
  }

  sock.ev.on("connection.update", (update) => {
    console.log('con update');
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect?.error,
        ", reconnecting ",
        shouldReconnect
      );
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("opened connection");
      // jobTasks();
    }
  });
  sock.ev.on("messages.upsert", async (m) => {
    const receivedMessage = m.messages[0];
    const senderJid = receivedMessage.key.remoteJid;
    const senderPhone = (senderJid?.match(/(\d+)@s\.whatsapp\.net/) ?? [])[1];
    const messageConversation = receivedMessage.message?.conversation
    const messageExtended = receivedMessage.message?.extendedTextMessage?.text
    const messageUser = !!messageConversation ? messageConversation : messageExtended;

    
    if (typeof senderJid !== 'string') throw Error('on.message typeof senderJid !== "string"');
    
    if(authPhones.some(item => item.phone === senderPhone)) {
      console.log('receivedMessage', senderPhone, messageUser);
    }
    
    // console.log('messages.upsert: ', senderJid, senderPhone, senderFlows[senderJid], messageUser);


    if(receivedMessage.key.fromMe && !messageUser?.includes("/stop")) return;

    //* esto debería ser para usuarios registrados, para otros no quiero, o para ciertos grupos no quiero.
    if(messageUser?.includes("/stop")) {
      senderFlows[senderJid] = {
        flow: 'default',
        state: 'init',
        source: '/stop userMessage',
        thread: undefined,
        assistantId: undefined
      }
      delete mHistory[senderJid];
      chainHistory[senderJid] = null;
      respondedToMessages.delete(senderJid);

      //* Debería aca borrar el historial?
      console.log('upsert /stop');
      return;
    }

    // if available !! <- guardar esa info en la DB y luego en alguna estructura, porque pueden ser muchos !!
    if (!senderFlows[senderJid]) {

      const credits = await getCreditsPhone(senderPhone)
      if(credits <= 0) return;
      console.log('credits1: ', credits);

      console.log('!senderFlows[senderJid]');
      senderFlows[senderJid] = {
        flow: 'default',
        state: 'init',
        source: 'constructor()',
        credits: credits ?? 20,
      }
      
      console.log('sF[] cred', senderFlows[senderJid].credits);
    }

    async function getCreditsPhone(phone: string) {
      console.log('flagA')
      const messages = await getMessage(phone);
      console.log('flagB')
      console.log('getCreditsPhone: ', messages, 'credits: ', messages?.credits);
      console.log('flagC')

      return messages?.credits;
    }

    if(messageUser?.startsWith('/')) {
      console.log('messageUser startsWith /');
      for (const codeKey in activeCodes) {
        if (activeCodes.hasOwnProperty(codeKey)) {
          if(messageUser === codeKey) {
            console.log(`Code Key: ${codeKey}`);
            const campaign: Campaign = activeCodes[codeKey];
            console.log('Campaign:', campaign);
            jobTaskCode(codeKey, campaign, senderJid);
          }
        } else {
          console.log(`${messageUser} flow not supported`)
        }
      }
    }

    async function jobTaskCode(codeKey: string, campaign: Campaign, senderJid: string) {
      const task = campaign.versions[0];
      const isValidPhone = authPhones.some(item => item.phone === senderPhone);
      console.log('isValidePhone', isValidPhone);
      if(!isValidPhone) return;
      
      if(codeKey === '/h2') {
        campaign.assistantId = 'asst_JjHw8XtHHFBRVv7hcSglmyGz';
      }
      if(codeKey === '/h3r') {
        campaign.assistantId = 'asst_3sJqO4RxdbyJsJrik3r22MNv';
      }
      console.log('jobTaskCode, ', codeKey, 'camp.a, ', campaign?.assistantId);
      senderFlows[senderJid].flow = 'jobTaskCode'
      senderFlows[senderJid].state = 'generating'
      senderFlows[senderJid].campaign = campaign
      senderFlows[senderJid].source = 'jobTaskCode'
      
      console.log('jobTaskCode');
      respondedToMessages.add(senderJid);

      // TODO send related with the language the person talks, or the country id native languge. :think
      if(task.firstMessage) await sock.sendMessage(senderJid, {
        text: task.firstMessage,
      });
      else {
        task.prompt
      }

      // En teoría acá debería reiniciar la historia.
      mHistory[senderJid] = []
      mHistory[senderJid] = [
        {role: 'system', content: task.prompt as string},
        {role: 'assistant', content: task.firstMessage as string}
      ];
      
      saveConversation('system', task.prompt as string, Number(task.phone));
      saveConversation('assistant', task.firstMessage as string, Number(task.phone));
      
      const myAssistantId = await createAssistant(task.prompt, task.name, campaign);
      senderFlows[senderJid].assistantId = myAssistantId;
      
      const thread = await createThread();
      senderFlows[senderJid].thread = thread;
      
      await delay(1_500);
      senderFlows[senderJid].state = 'init';
      respondedToMessages.delete(senderJid);
    }

    if(!respondedToMessages.has(senderJid) &&
    messageUser === '/brandx' &&
    senderFlows[senderJid].flow === 'default' &&
    senderFlows[senderJid].state === 'init') {
      console.log('/brandx default init');

      senderFlows[senderJid].flow === '/brandx'
      senderFlows[senderJid].state === 'generating'

      respondedToMessages.add(senderJid);

      setTimeout(() => {
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: "Describe your product, company or idea",
        });
        senderFlows[senderJid].state = 'rprompt';
      }, 2_500);

      setTimeout(() => {
        respondedToMessages.delete(senderJid);
      }, 3_500);
    }

    if(!respondedToMessages.has(senderJid) &&
    senderFlows[senderJid].flow === '/brandx' &&
    senderFlows[senderJid].state === 'rprompt') {

    }

    if(!respondedToMessages.has(senderJid) &&
    messageUser === '/avatar' &&
    senderFlows[senderJid].flow === 'default' &&
    senderFlows[senderJid].state === 'init') {
      console.log('/avatar default init');

      senderFlows[senderJid].flow === '/avatar'
      senderFlows[senderJid].state === 'generating'

      sock.sendMessage(senderJid, {
        text: "generating ...",
      });


      setTimeout(() => {
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: "Sube una foto de referencia de tu rostro",
        });
        senderFlows[senderJid].state = 'product';
      }, 2_500);

      setTimeout(() => {
        respondedToMessages.delete(senderJid);
      }, 3_500);
    }

    if(!respondedToMessages.has(senderJid) &&
    senderFlows[senderJid].flow === '/brandx' &&
    senderFlows[senderJid].state === 'product') {
      console.log('/brandx product');
      sock.sendMessage(senderJid, {
        text: "generating ...",
      });
      if(!BASE_GEN) return;
      // if(JD_NUMBER !== 'string') throw Error('JD_NUMBER is no string');

      const product = messageUser
      
      setTimeout(async () => {
        let textAssets: DesighBrief;

        const payload: RequestPayload = {
          chain: "logoChain",
          prompt: {
            product: product
          }
        };
        try {
          textAssets = await genChat(payload, Number(MVP_RECLUIMENT_CLIENT));
          console.log('index#textAssets (response)', textAssets)
        } catch (error) {
          console.log('error -> ')
          console.error(error)
          if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
            text: "error",
          });
          return
        }
        console.log('index#textAssets -> ', textAssets)

        let logoPrompt = '';

        for (const [key, value] of Object.entries(textAssets)) {
          console.log(`${key}: ${value}`);
          if(key !== "logoPrompt" && key !== "whyLogo") await sock.sendMessage(senderJid, {
            text: `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`,
          });
          else {
            if(typeof value === 'string') logoPrompt = value
          }
        }

        sock.sendMessage(senderJid, {
          text: "generating logos ...",
        });
        
        const logos = await getLogo(logoPrompt)

        for (const logo of logos) {
          console.log(logo)
          await sock.sendMessage(senderJid, {
            image: {
              url: logo
            }
          })
        }

        if(typeof textAssets.whyLogo === 'string') sock.sendMessage(senderJid, {
          text: "Logo Composition: " + textAssets.whyLogo,
        });
        
        const phone = senderJid.split('@')[0];
        if(typeof product !== 'string') return

        const saveResult = await saveGenerations(textAssets, logos, product, phone);
        console.log('save: ', saveResult);

        setTimeout(() => {
          respondedToMessages.delete(senderJid);
        }, 2_500)
        senderFlows[senderJid].state = 'end';

      }, 2_500)
    }

    // Caso de continuar con la interacción de los jobs
      // Había pensado en senderFlow, y senderState, así tengo cuál es el /skill y cuál es el estado :)
      // En /brandx tengo luego de /brandx -> product como senderFlow
      // En otros códigos, tengo init, pero creo que debería ser generating, y poner init al inicio.


    // Caso phoneJob
    if(senderFlows[senderJid].flow === 'jobTaskPhone' &&
    senderFlows[senderJid].state === 'init'
    ) jobTask('jobTaskPhone', senderJid, senderFlows[senderJid].campaign);
    
    // Caso jobCodes
    if(senderFlows[senderJid].flow === 'jobTaskCode' &&
    senderFlows[senderJid].state === 'init'
    ) jobTask('jobTaskCode', senderJid, senderFlows[senderJid].campaign);

    async function jobTask(
      flowTaskChain: 'jobTaskPhone' | 'jobTaskCode' | 'jobChain', 
      senderJid: string, 
      campaign?: Campaign
    ) {
      console.log('jobTask ', flowTaskChain);
      senderFlows[senderJid].state = 'generating';
      senderFlows[senderJid].source = 'jobTask';

      console.log('jobTask', campaign?.versions[0].code);

      const task = campaign?.versions[0];

      mHistory[senderJid].push({role: 'user', content: messageUser as string});

      let payload: RequestPayloadChat = {
        chain: flowTaskChain,
        messages: mHistory[senderJid],
      };
      
      // create thread
      // create message
      // run
      // retrieve

      // const myAssistant = await createAssistant(defaultPrompt().content as string, 'default')
      // senderFlows[senderJid].assistant = myAssistant;
      // senderFlows[senderJid].thread = await createThread();
      console.log('xxx jobTask senderFlows[senderJid]: ', senderFlows[senderJid]);
      console.log('xxx JobTask thread.id .assistantId');
      console.log(senderFlows[senderJid].thread.id, senderFlows[senderJid].assistantId);

      let gptResponse: string;

      try {
        let response = await genChat(
          payload,
          Number(senderPhone), 
          null,
          senderFlows[senderJid].thread.id,
          senderFlows[senderJid].assistantId,
          senderFlows[senderJid].credits,
        );
        gptResponse = response.gptResponse
        if (senderFlows[senderJid].credits) {
          (senderFlows[senderJid] as any).credits--;
        }
      } catch (error) {
        gptResponse = "err, please try again";
      }

      console.log('jobTask() gptResponse: ', gptResponse, task?.nxCode, gptResponse.includes(task?.nxCode as string));
      
      if (gptResponse.includes("/done")) {
        // Creo que esto no lo guarda ... :think
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: gptResponse,
        });
        await delay(2_000);
        senderFlows[senderJid].flow = 'done'
        senderFlows[senderJid].state = 'init'
        senderFlows[senderJid].source = '/done default'
      } else if(task?.nxCode && gptResponse.includes(task?.nxCode)) {
        console.log('jobTask() includes nxCode ', task?.nxCode);
        const skill = task.nxCode;
        let isSkill = false;
        
        for (const codeKey in activeCodes) {
          if (activeCodes.hasOwnProperty(codeKey)) {
            if(skill === codeKey) {
              console.log(`skills ${skill} is === to codeKey ${codeKey}`);
              isSkill = true;
              console.log('codeKey');
              const newCampaign: Campaign = activeCodes[codeKey];
              console.log('Campaign:', campaign);
              // Acá se que existe un mensaje para activar un nuevo skill, tengo un history, Y se lo debo pasar a
              if(newCampaign.versions[0].type === 'jobSys') {
                if(typeof senderJid === 'string') await sock.sendMessage(senderJid, {
                  text: "==========",
                });
                await delay(500);
                jobSys(skill, senderJid, newCampaign);

              } else {
                // Lo que creo es que acá se va a repetir, porque llama a esta misma función, y agrega el messageUser
                jobTask('jobChain', senderJid, campaign);
              }
              // jobTaskCode(codeKey, campaign, senderJid);
            }
          }
        }
        if(!isSkill) {
          if(typeof senderJid === 'string') await sock.sendMessage(senderJid, {
            text: gptResponse,
          });
    
          await delay(2_500);
          respondedToMessages.delete(senderJid);
          senderFlows[senderJid].state = 'init';
        }
      } else if(gptResponse.includes("/on")) {
        console.log('xxxxxx gptR: ', gptResponse);
        if(typeof senderJid === 'string') await sock.sendMessage(senderJid, {
          text: gptResponse.replace("/on", ""),
        });
  
        await delay(2_500);
        respondedToMessages.delete(senderJid);
        senderFlows[senderJid].state = 'init';
        senderFlows[senderJid].source = 'jobTask not includes codes';
      }
      else {
        // Debería volver a invocar,
        console.log('jobTask() not includes');
        if(typeof senderJid === 'string') await sock.sendMessage(senderJid, {
          text: gptResponse,
        });
  
        await delay(2_500);
        respondedToMessages.delete(senderJid);
        senderFlows[senderJid].state = 'init';
        senderFlows[senderJid].source = 'jobTask not includes codes';
      }
      mHistory[senderJid].push({role: 'assistant', content: gptResponse});
      // console.log(mHistory[senderJid]);
    }

    async function jobSys(skill: string, senderJid: string, campaign: Campaign) {
      // Acá tengo el skill, tengo toda la campaign asociada al skill, y el sender.
      // Con eso puedo iniciar el prompt, para con la información de history actual, generar lo que necesite.
      // En este caso solo debo agregarle a mHistory el nuevo sysPrompt, y entonces esperar la respuesta
      // Esa respuesta va a conformar el sys de el nuevo jobTask, que ese si va a responderle al usuario, :)
      console.log('jobSys');
      senderFlows[senderJid].flow = 'jobSys';
      senderFlows[senderJid].state = 'generating';
      senderFlows[senderJid].source = 'jobSys';
      senderFlows[senderJid].campaign = campaign;
      senderFlows[senderJid].skill = skill;
      
      const sysPrompt = campaign.versions[0].prompt;
      mHistory[senderJid].push({role: 'system', content: sysPrompt});
      
      const payloadSys: RequestPayloadChat = {
        chain: 'jobTaskSys',
        messages: mHistory[senderJid],
      };
      
      const gptResponseSys = await genChat(payloadSys, Number(senderPhone));
      
      mHistory[senderJid] = [];
      mHistory[senderJid].push({ role: 'system', content: gptResponseSys.gptResponse });
      
      console.log('gptResponseSys: ', gptResponseSys.gptResponse);
      
      const payload: RequestPayloadChat = {
        chain: 'jobTaskCode',
        messages: mHistory[senderJid],
      };

      const newAssistantId = await createAssistant(gptResponseSys.gptResponse, 'newBot');
      senderFlows[senderJid].assistantId = newAssistantId;
      
      const newThread = await createThread();
      senderFlows[senderJid].thread = newThread;
      
      console.log('xxx jobSys', newAssistantId, newThread.id);

      const { gptResponse } = await genChat(
        payload,
        Number(senderPhone), 
        null,
        senderFlows[senderJid].thread.id, 
        senderFlows[senderJid].assistantId
      );

      await sock.sendMessage(senderJid, {
        text: gptResponse,
      });
      await delay(2_000);
      
      senderFlows[senderJid].flow = 'jobTaskCode';
      senderFlows[senderJid].state = 'init';
      
      // console.log('jobSys thread.id | assistant.id: ', senderFlows[senderJid].thread.id, senderFlows[senderJid].assistant.id);
      senderFlows[senderJid].source = 'jobSys end';
      // console.log(mHistory[senderJid]);
    }
    
    async function jobTask2(flowTaskChain: 'jobTaskPhone' | 'jobTaskCode', senderJid: string) {
      console.log('jobTask ', flowTaskChain);
      senderFlows[senderJid].state = 'generating';

      mHistory[senderJid].push({role: 'user', content: messageUser as string})

      let payload: RequestPayloadChat = {
        chain: flowTaskChain,
        messages: mHistory[senderJid],
      };
      // Acá simplemente sigue la conversación, entonces debo obtener el numéro asociado.
      let gptResponse = await genChat(payload, Number(senderPhone));
      if (gptResponse.includes("/done")) {
        // Creo que esto no lo guarda ... :think
        const regex = new RegExp(`\\/done.*`);
        gptResponse = gptResponse.replace(regex, "");
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: gptResponse,
        });
        await delay(2_000);
        senderFlows[senderJid].flow = 'done'
        senderFlows[senderJid].state = 'init'
        senderFlows[senderJid].source = '/done default'
      } else {
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: gptResponse,
        });
  
        await delay(2_500);
        respondedToMessages.delete(senderJid);
        senderFlows[senderJid].state = 'init';
      }
      mHistory[senderJid].push({role: 'assistant', content: gptResponse});
      console.log(mHistory[senderJid]);
    }
    
    if(!respondedToMessages.has(senderJid) &&
    authPhones.some(item => item.phone === senderPhone) &&
    senderFlows[senderJid].flow === 'default' &&
    senderFlows[senderJid].state === 'init' &&
    DEFAULT_FLOW
    ) {

      respondedToMessages.add(senderJid);
      // Esta respondiendo doble?, por qué volvió a enviarlo?
      
      if (!mHistory[senderJid]) {
        mHistory[senderJid] = [defaultPrompt(), firstMessage()];
        const myAssistantId = await createAssistant(defaultPrompt().content as string, 'default')
        senderFlows[senderJid].assistantId = myAssistantId;
        // senderFlows[senderJid].assistant = {
        //   id: 'asst_F5hljdLdf5GLzqj1pNfVEdFW' //
        // };
        senderFlows[senderJid].thread = await createThread();
      }
      mHistory[senderJid].push({role: 'user', content: messageUser as string});
      // console.log(mHistory, mHistory[senderJid].length);
      
      let payload: RequestPayloadChat = {
        chain: 'default',
        messages: mHistory[senderJid],
      };

      if(senderFlows[senderJid].state === 'init' 
        && senderFlows[senderJid].flow === 'default'
      ) {
        console.log('default() state is init');
        console.log('flag3');
        senderFlows[senderJid].state = 'generating';
        senderFlows[senderJid].source = 'generating default'
        console.log('default() state is generating');
        let response = await genChat(
          payload,
          Number(MVP_RECLUIMENT_CLIENT),
          null,
          senderFlows[senderJid].thread.id,
          senderFlows[senderJid].assistantId
        );
        // console.log({ gptResponse, memory: await chain.loadMemoryVariables({})});
        // chainHistory[senderJid] = chain;
        console.log('response', response);
        let { gptResponse } = response;

        if (gptResponse.includes("#DONE#")) {
          // Creo que esto no lo guarda ... :think
          const regex = new RegExp(`#DONE#.*`);
          gptResponse = gptResponse.replace(regex, "");
          if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
            text: gptResponse,
          });
          await delay(2_000);
          mHistory[senderJid].push({role: 'assistant', content: gptResponse});
          console.log(mHistory[senderJid]);
          senderFlows[senderJid].flow = 'done'
          senderFlows[senderJid].state = 'init'
          senderFlows[senderJid].source = '/done default'
          console.log('gptResponse /done, ', gptResponse, senderFlows);
        } else {
          if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
            text: gptResponse,
          });
          await delay(2_000);
          respondedToMessages.delete(senderJid);
          senderFlows[senderJid].state = 'init';
          senderFlows[senderJid].source = 'end default';
          console.log('default() end init');
          console.log('default state', senderFlows[senderJid]);
        }
        console.log('default() after await');   
      }
    }
  });
}

connectToWhatsApp();
