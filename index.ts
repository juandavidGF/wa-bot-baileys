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

import { getTasks, updateTask } from './db/tasks';
import { Campaign } from "./models/tasks";

require('dotenv').config();

const JUAND4BOT_NUMBER = process.env.JUAND4BOT_NUMBER;
const JD_NUMBER = process.env.JD_NUMBER;
// const MVP_RECLUIMENT_CLIENT = process.env.MVP_RECLUIMENT_CLIENT;
const MVP_RECLUIMENT_CLIENT = JUAND4BOT_NUMBER;
const respondedToMessages = new Set();
const BASE_GEN = process.env.BASE_GEN;

// Quizá también debería agregar una para la app en la que esta, así le doy una prioridad.
interface SenderFlowState {
  flow: string;
  state: string;
  source?: string;
  task?: any;
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

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info_juanGranados');
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
    const version = camp.versions[0]
    if(!!version.code?.name) {
      activeCodes[version.code.name] = camp
    }
  });

  // Debería acá llamar las task para llenar una variable con las de código también.
  // De modo que las de código las revise primero cuando recibe un mensaje,
    // Y según si tiene phone, las filtre y ejecute.
  setTimeout(() => jobTasksPhone(tasksP), 1_000);

  setInterval(async () => {
    const newTasks = await getTasks();
    newTasks.code.forEach(camp => {
      const version = camp.versions[0];
      if(!!version.code?.name) {
        activeCodes[version.code.name] = camp
      }
    });
    jobTasksPhone(newTasks['phone']);
  }, interval);

  // Guardar cuando fue completado la task, luego puedo ver en que punto (como por ejemplo luego del #DONE#).
  // No mandó el #Done#, así que debo revisar que pasó, y como mejorarlo.
  // Quizá las campañas deberían crearse independientemente, para permitir una a muchas ... :).
  // Debo revisar según el date, si es default mandarlo, si no a pasado aún esperar :).

  // Y acá no se supone que debe solo ejecutar una ??
  async function jobTasksPhone (tasksP: Campaign[]) {
    if (!!tasksP && tasksP.length > 0) {
      for(const taskVs of tasksP) {
        const task = taskVs.versions[0]
        // Acá debo ver cuáles son los únicos que estan habilitados.
        if(!!task && !!task?.phone && task?.phone == Number(JUAND4BOT_NUMBER) ) {
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
          saveConversation('system', task.prompt as string, Number(task.phone));
          saveConversation('assistant', task.firstMessage as string, Number(task.phone));
          await updateTask(taskVs, Number(task.phone));
          await delay(1_500);
          senderFlows[senderJidLocal].state = 'init';
          respondedToMessages.delete(senderJidLocal);
        }
      }
    }
  }

  sock.ev.on("connection.update", (update) => {
    console.log('con update')
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

    console.log(messageUser);

    if (typeof senderJid !== 'string') throw Error('on.message typeof senderJid !== "string"');

    console.log('upsert senderFlows[senderJid]: ', senderFlows[senderJid]);

    //* esto debería ser para usuarios registrados, para otros no quiero, o para ciertos grupos no quiero.
    if(messageUser?.includes("/stop")) {
      senderFlows[senderJid] = {
        flow: 'default',
        state: 'init',
        source: '/stop userMessage',
      }
      mHistory[senderJid] = [];

      //* Debería aca borrar el historial?
      console.log('upsert /stop');
      return;
    }

    // if available !! <- guardar esa info en la DB y luego en alguna estructura, porque pueden ser muchos !!
    if (!senderFlows[senderJid]) {
      console.log('upsert !senderFlows[senderJid]');
      senderFlows[senderJid] = {
        flow: 'default',
        state: 'init',
        source: 'constructor()'
      }
    }

    // if(messageUser?.includes("/stop")) {
    //   senderFlows[senderJid] = {
    //     flow: '/wait',
    //     state: 'init',
    //     source: '/stop constructor()',
    //   }
    // } else if(senderFlows[senderJid].flow === '/wait') {
    //   senderFlows[senderJid] = {
    //     flow: 'default',
    //     state: 'init',
    //     source: '/wait constructor()',
    //   }
    //   respondedToMessages.delete(senderJid);
    // }

    // Acá debería manejar los comandos, según prioridades, estados ...
    // Y creo que es hora de volver todo esto funciones para darle más orden :)
    if(messageUser?.startsWith('/')) {
      console.log('messageUser startsWith /');
      //* agregar si es /stop
      // si existe ese flujo, debo comparar contra los flujos
      for (const codeKey in activeCodes) {
        if (activeCodes.hasOwnProperty(codeKey)) {
          if(messageUser == codeKey) {
            console.log(`Code Key: ${codeKey}`);
            const campaign: Campaign = activeCodes[codeKey];
            console.log('Campaign:', campaign);
            jobTaskCode(codeKey, campaign, senderJid);
            // Bueno esto quiere decir que tiene que iniciar esta task
            // Y tiene guardado un prompt, y un firtsMessage, luego puede ser algo más avanzado, una serie de tareas
            // Y en teoría las demás deberían estar asociadas a esas tasks, como brand ... :D
          }
        } else {
          console.log(`${messageUser} flow not supported`)
        }
      } 
    }

    async function jobTaskCode(codeKey: string, campaign: Campaign, senderJid: string) {
      // debo eliminar el responded para ese número, o más bien, activarlo para bloquearlo acá.
      // Debo actualizar o crear el senderFlow a este code ...
      // Luego de so debo ejecutar el prompt, y el firtsMessage -> Esto va a ser curioso.
      senderFlows[senderJid] = {
        flow: 'jobCode',
        state: 'generating',
      }
      console.log('jobTaskCode');
      respondedToMessages.add(senderJid)

      const task = campaign.versions[0];

      if(task.firstMessage) await sock.sendMessage(senderJid, {
        text: task.firstMessage,
      });

      // En teoría acá debería reiniciar la historia.
      mHistory[senderJid] = []
      mHistory[senderJid] = [
        {role: 'system', content: task.prompt as string},
        {role: 'assistant', content: task.firstMessage as string}
      ];

      saveConversation('system', task.prompt as string, Number(task.phone));
      saveConversation('assistant', task.firstMessage as string, Number(task.phone));
      //* Debería update según alguna politica?, número máximo ...
      // await updateTask(taskVs, Number(task.phone));
      await delay(1_500);
      senderFlows[senderJid].state = 'init';
      respondedToMessages.delete(senderJid);
    }

    if(!respondedToMessages.has(senderJid) &&
    messageUser === '/brandx' &&
    senderFlows[senderJid].flow === 'default' &&
    senderFlows[senderJid].state === 'init') {
      // console.log(JSON.stringify(m, undefined, 2));
      console.log('/brandx default init');

      senderFlows[senderJid].flow === '/brandx'
      senderFlows[senderJid].state === 'generating'

      respondedToMessages.add(senderJid);

      setTimeout(() => {
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: "Describe your product, company or idea",
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
          textAssets = await genChat(payload, Number(JD_NUMBER));
          console.log('index#textAssets (response)', textAssets)
        } catch (error) {
          //Debo hacer que se genere error, y si eso pasa entonces, volverla a llamar máximo 3 veces ...
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
    ) jobTask('jobTaskPhone', senderJid);
    
    // Caso jobCodes
    if(senderFlows[senderJid].flow === 'jobCode' &&
    senderFlows[senderJid].state === 'init'
    ) jobTask('jobTaskCode', senderJid);

    async function jobTask(flowTaskChain: 'jobTaskPhone' | 'jobTaskCode', senderJid: string) {
      console.log('jobTask ', flowTaskChain);
      senderFlows[senderJid].state = 'generating';

      mHistory[senderJid].push({role: 'user', content: messageUser as string})

      let payload: RequestPayloadChat = {
        chain: flowTaskChain,
        messages: mHistory[senderJid],
      };
      // Acá simplemente sigue la conversación, entonces debo obtener el numéro asociado.
      let {gptResponse, flush } = await genChat(payload, Number(senderPhone));
      if(flush) {
        mHistory[senderJid].pop();
        mHistory[senderJid].pop();
        mHistory[senderJid].pop();
      }
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

    // if (senderJid === `${JD_NUMBER}@s.whatsapp.net`) {
    //   console.log('reveived Message from: ', senderJid);
    //   console.log(JSON.stringify(receivedMessage));
    //   console.log('mgConv', typeof messageConversation, messageConversation, 'mgExt', typeof messageExtended, messageExtended, 'mUser: ', messageUser);
    // }
    if (senderJid === `${MVP_RECLUIMENT_CLIENT}@s.whatsapp.net`) {
      // console.log('!respondedToMessages.has(senderJid)', !respondedToMessages.has(senderJid));
      // console.log(`senderFlows[${senderJid}]`, senderFlows[senderJid]);
      // console.log('reveived Message from: ', senderJid);
      // console.log(messageUser);
      // console.log(JSON.stringify(receivedMessage));
      // console.log('mgConv', typeof messageConversation, messageConversation, 'mgExt', typeof messageExtended, messageExtended, 'mUser: ', messageUser);
    }

    // Debo manejar un caso default, y un caso si X número le escribe. (checkbox-mandar 1° mensaje en UI).
    if(!respondedToMessages.has(senderJid) &&
    senderJid === `${MVP_RECLUIMENT_CLIENT}@s.whatsapp.net` &&
    senderFlows[senderJid].flow === 'default' &&
    senderFlows[senderJid].state === 'init'
    ) {

      console.log('flag1 default()');
      
      // console.log('default() after /stop')


      respondedToMessages.add(senderJid);
      // Esta respondiendo doble?, por qué volvió a enviarlo?

      // Actualizar flujo acá.
      if (!mHistory[senderJid]) {
        mHistory[senderJid] = [defaultPrompt(), firstMessage()];
      }
      mHistory[senderJid].push({role: 'user', content: messageUser as string});
      console.log(mHistory, mHistory[senderJid].length);
      
      let payload: RequestPayloadChat = {
        chain: 'default',
        messages: mHistory[senderJid],
      };

      if(senderFlows[senderJid].state === 'init' && senderFlows[senderJid].flow === 'default') {
        console.log('default() state is init');
        console.log('flag3');
        senderFlows[senderJid].state = 'generating';
        senderFlows[senderJid].source = 'generating default'
        console.log('default() state is generating');
        let { gptResponse, summary, flush } = await genChat(payload, Number(MVP_RECLUIMENT_CLIENT));
        if(flush) {
          mHistory[senderJid].pop();
          mHistory[senderJid].pop();
          mHistory[senderJid].pop();
        }

        if (gptResponse.includes("/done")) {
          // Creo que esto no lo guarda ... :think
          const regex = new RegExp(`\\/done.*`);
          gptResponse = gptResponse.replace(regex, "");
          if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
            text: gptResponse,
          });
          await delay(2_000)
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
          await delay(2_000)
          respondedToMessages.delete(senderJid);
          senderFlows[senderJid].state = 'init';
          senderFlows[senderJid].source = 'end default';
          console.log('default() end init');
          console.log('default state', senderFlows[senderJid]);
        }
        console.log('default() after await');
        mHistory[senderJid].push({role: 'assistant', content: gptResponse});
        console.log(mHistory[senderJid]);
      }
    }
    
    // if(messageUser === '/getMgs' &&
    // senderJid === `${JD_NUMBER}@s.whatsapp.net`
    // ) getMessage();
  });
}

connectToWhatsApp();