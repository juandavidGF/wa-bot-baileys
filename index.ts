import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore, useMultiFileAuthState, MessageType } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import logger from "./utils/logger";
import { delay } from "./utils/delay";
import { firstMessage, mvpRecluimentPrompt } from "./lib/Prompts";

import { genChat, saveConversation } from './genChat';
import getLogo from './getLogo';
import getMessage from './db/getMessages';
import saveGenerations from './db/saveGenerations';
import { DesighBrief } from "./models/logoapp";
import { ChatCompletionMessageParam } from "openai/resources/chat";

import { getTasks, updateTask } from './db/Tasks'

require('dotenv').config();

const JUAND4BOT_NUMBER = process.env.JUAND4BOT_NUMBER;
const JD_NUMBER = process.env.JD_NUMBER;
// const MVP_RECLUIMENT_CLIENT = process.env.MVP_RECLUIMENT_CLIENT;
const MVP_RECLUIMENT_CLIENT = JD_NUMBER;
const respondedToMessages = new Set();
const BASE_GEN = process.env.BASE_GEN;

interface SenderFlows {
  [key: string]: string; // Key is a string, value is a string
}

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
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info_juand4bot');
  logger.level = 'trace';
  
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });
  
  sock.ev.on("creds.update", saveCreds);

  const interval = 3*60*1_000 //10m

  jobTasks();

  setInterval(() => {
    jobTasks();
  }, interval);

  // Guardar cuando fue completado la task, luego puedo ver en que punto (como por ejemplo luego del #DONE#).
  // No mandó el #Done#, así que debo revisar que pasó, y como mejorarlo.
  // Quizá las campañas deberían crearse independientemente, para permitir una a muchas ... :).
  // Debo revisar según el date, si es default mandarlo, si no a pasado aún esperar :).

  async function jobTasks () {
    const tasks = await getTasks();
    console.log('jobTasks: ', !!tasks, tasks.length, tasks);
    // por alguna razón luego del firstMessage, no responde nada ...

    if (!!tasks && tasks.length > 0) {
      for(const task of tasks) {
        if(!task?.phone) return;
        console.log('onjobTask for..of');
        const firstTask = task;
        const senderJidLocal = `${task?.phone}@s.whatsapp.net`;
        if (!senderFlows[senderJidLocal]) {
          senderFlows[senderJidLocal] = 'initial';
        }
        respondedToMessages.add(senderJidLocal);
        senderFlows[senderJidLocal] = 'generating';
        const firstMessageR = task.firstMessage as string;
        await sock.sendMessage(senderJidLocal, {
          text: firstMessageR,
        });
        if (!mHistory[senderJidLocal]) {
          mHistory[senderJidLocal] = [
            {role: 'system', content: task.prompt as string},
            {role: 'assistant', content: task.firstMessage as string}
          ];
        }
        saveConversation('system', task.prompt as string, task.phone);
        saveConversation('assistant', task.firstMessage as string, task.phone);
        await updateTask(task, task.phone);
        await delay(1_500);
        senderFlows[senderJidLocal] = 'initial';
        respondedToMessages.delete(senderJidLocal);
      }
    }
  }

  sock.ev.on("connection.update", (update) => {
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
    const messageConversation = receivedMessage.message?.conversation
    const messageExtended = receivedMessage.message?.extendedTextMessage?.text
    const messageUser = !!messageConversation ? messageConversation : messageExtended;

    if (typeof senderJid !== 'string') throw Error('on.message typeof senderJid !== "string"');

    if (!senderFlows[senderJid]) {
      senderFlows[senderJid] = 'initial';
    }

    // if (senderJid === `${JD_NUMBER}@s.whatsapp.net`) {
    //   console.log('reveived Message from: ', senderJid);
    //   console.log(JSON.stringify(receivedMessage));
    //   console.log('mgConv', typeof messageConversation, messageConversation, 'mgExt', typeof messageExtended, messageExtended, 'mUser: ', messageUser);
    // }
    if (senderJid === `${MVP_RECLUIMENT_CLIENT}@s.whatsapp.net`) {
      console.log('!respondedToMessages.has(senderJid)', !respondedToMessages.has(senderJid));
      console.log('reveived Message from: ', senderJid);
      console.log(JSON.stringify(receivedMessage));
      console.log('mgConv', typeof messageConversation, messageConversation, 'mgExt', typeof messageExtended, messageExtended, 'mUser: ', messageUser);
    }

    if(!respondedToMessages.has(senderJid) &&
    senderJid === `${MVP_RECLUIMENT_CLIENT}@s.whatsapp.net`
    ) {
      console.log('flag1');
      respondedToMessages.add(senderJid);
      // Esta respondiendo doble?, por qué volvió a enviarlo?

      if (!mHistory[senderJid]) {
        mHistory[senderJid] = [mvpRecluimentPrompt(), firstMessage()];
      }
      mHistory[senderJid].push({role: 'user', content: messageUser as string});
      console.log(mHistory, mHistory[senderJid].length);
      if (messageUser?.includes("#DONE#")) return;
      let payload: RequestPayloadChat = {
        chain: 'mvpRecluimentClient',
        messages: mHistory[senderJid],
      };

      console.log('flag2');

      if(senderFlows[senderJid] === 'initial' || senderFlows[senderJid] === 'userReseach') {
        console.log('flag3');
        senderFlows[senderJid] = 'generating';
        let gptResponse = await genChat(payload, Number(MVP_RECLUIMENT_CLIENT));
        mHistory[senderJid].push({role: 'assistant', content: gptResponse});
        console.log('flag4');
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: gptResponse,
        });
        console.log('flag5');
        await delay(2_500);
        respondedToMessages.delete(senderJid);
        if (gptResponse.includes("#DONE#")) {
          senderFlows[senderJid] = 'initial';
          return;
        }
        senderFlows[senderJid] = 'userReseach';
        console.log('flag6');
      }
    }
    
    if(messageUser === '/getMgs' &&
    senderJid === `${JD_NUMBER}@s.whatsapp.net`
    ) getMessage();
    if(!respondedToMessages.has(senderJid) &&
    messageUser === '/brandx' &&
    senderFlows[senderJid] === 'initial') {
      // console.log(JSON.stringify(m, undefined, 2));

      respondedToMessages.add(senderJid);

      setTimeout(() => {
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: "Describe your product, company or idea",
        });
        senderFlows[senderJid] = 'product';
      }, 2_500)

      setTimeout(() => {
        respondedToMessages.delete(senderJid);
      }, 3_500)
    }
    if(!respondedToMessages.has(senderJid) &&
    senderFlows[senderJid] === 'product') {
      sock.sendMessage(senderJid, {
        text: "generating ...",
      });
      senderFlows[senderJid] = 'generating';
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
        // call generate logo ...
        //Respond

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
        senderFlows[senderJid] = 'initial';

      }, 2_500)
    }
  });
}

connectToWhatsApp();