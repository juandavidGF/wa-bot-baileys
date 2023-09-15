import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore, useMultiFileAuthState, MessageType } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import logger from "./utils/logger";
import { delay } from "./utils/delay";
import axios from 'axios';
import { mvpRecluimentPrompt } from "./lib/Prompts";

import { genChat } from './genChat'
import getLogo from './getLogo'
import getMessage from './db/getMessages'
import saveGenerations from './db/saveGenerations'
import { DesighBrief } from "./models/logoapp";
import { ChatCompletionMessageParam } from "openai/resources/chat";

require('dotenv').config();

const JUAND4BOT_NUMBER = process.env.JUAND4BOT_NUMBER || '';
const JD_NUMBER = process.env.JD_NUMBER;
// const MVP_RECLUIMENT_CLIENT = process.env.MVP_RECLUIMENT_CLIENT 
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

interface Task {
  name: 'mvpRecluimentFirstMessage' | 'none';
  phone: string;
  enabled: boolean;
}

interface Tasks {
  [key: string]: Task; // Key is a string, value is an array of Message objects
}
const tasks: Tasks = {}

tasks[`${MVP_RECLUIMENT_CLIENT}@s.whatsapp.net`] = {
  phone: MVP_RECLUIMENT_CLIENT as string,
  name: 'mvpRecluimentFirstMessage',
  enabled: true,
}

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
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info_juand4bot')
  logger.level = 'trace'
  
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });
  // this will be called as soon as the credentials are updated
  sock.ev.on("creds.update", saveCreds);

  setTimeout(async () => {
    for (const key in tasks) {
      if (tasks.hasOwnProperty(key)) {
        const task = tasks[key];
        console.log(key, task);
        if(task.enabled) {
          if (!senderFlows[key]) {
            senderFlows[key] = 'initial';
          }
          respondedToMessages.add(key);

          let firstMessage = `Hola, soy juand4bot, el agente de IA, de Juan David, te escribo porque vi tu publicación es Startup Colombia acerca de un MVP de recruiment que necesitas, te cuento que mi creador, tiene experiencia creando MVPs y trabajó en torre. Me gustaría hacerte unas preguntas para conocer tus requerimientos para luego si hay sinergias, agendar una videollamada con Juan David, te parece?`;

          senderFlows[key] = 'generating';
          await sock.sendMessage(key as string, {
            text: firstMessage,
          });
          
          if (!mHistory[key]) {
            mHistory[key] = [mvpRecluimentPrompt(), {role: 'assistant', content: firstMessage}];
          }
          await delay(2_500);
          respondedToMessages.delete(key);
          senderFlows[key] = 'initial';
        }
        // 'key' is the property key (e.g., `${JD_NUMBER}@s.whatsapp.net`)
        // 'task' is the corresponding object (e.g., { phone: ..., name: ..., enabled: ... })
      }
    }
  }, 5_000)


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
    }
  });
  sock.ev.on("messages.upsert", async (m) => {
    const receivedMessage = m.messages[0];
    const senderJid = receivedMessage.key.remoteJid;
    const messageConversation = receivedMessage.message?.conversation
    const messageExtended = receivedMessage.message?.extendedTextMessage?.text
    const messageUser = !!messageConversation ? messageConversation : messageExtended;

    if (typeof senderJid !== 'string') return

    if (!senderFlows[senderJid]) {
      senderFlows[senderJid] = 'initial';
    }

    if(!respondedToMessages.has(senderJid) &&
    senderJid === `${MVP_RECLUIMENT_CLIENT}@s.whatsapp.net`
    ) {
      respondedToMessages.add(senderJid);
      // Debo mandar el primer mensaje (queu)
      // Debo inicializar el historial, con el prompt,
      // debo recibir mensaje,
      // mandarlo al flujo de chatGPT,
      // console.log(typeof JD_NUMBER);
      // if(JD_NUMBER !== 'string') throw Error(`${JD_NUMBER} isn't a string`);
      // if(messageUser !== 'string') throw Error(`${messageUser} isn't a string`);

      if (!mHistory[senderJid]) {
        mHistory[senderJid] = [mvpRecluimentPrompt()];
      }
      mHistory[senderJid].push({role: 'user', content: messageUser as string});
      console.log(mHistory, mHistory[senderJid].length);
      let payload: RequestPayloadChat = {
        chain: 'mvpRecluimentClient',
        messages: mHistory[senderJid],
      };

      if(senderFlows[senderJid] === 'initial') {
        senderFlows[senderJid] = 'generating';
        let gptResponse = await genChat(payload, JD_NUMBER as string);
        mHistory[senderJid].push({role: 'assistant', content: gptResponse});
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: gptResponse,
        });
        await delay(2_500);
        respondedToMessages.delete(senderJid);
        if (gptResponse.includes("#DONE#")) return;
        senderFlows[senderJid] = 'initial';
      }
    }
    
    if (senderJid === `${JD_NUMBER}@s.whatsapp.net`) {
      console.log('reveived Message from: ', senderJid);
      console.log(JSON.stringify(receivedMessage));
      console.log('mgConv', typeof messageConversation, messageConversation, 'mgExt', typeof messageExtended, messageExtended, 'mUser: ', messageUser);
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
      if(JD_NUMBER !== 'string') throw Error('JD_NUMBER is no string');

      const product = messageUser
      
      setTimeout(async () => {
        let textAssets: DesighBrief;

        const payload: RequestPayload = {
          chain: "design_brief",
          prompt: {
            product: product
          }
        };
        try {
          textAssets = await genChat(payload, JD_NUMBER)
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