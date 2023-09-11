import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore, useMultiFileAuthState, MessageType } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import logger from "./utils/logger";
import { delay } from "./utils/delay";
import axios from 'axios'

import { genChat } from './genChat'
import getLogo from './getLogo'
import getMessage from './db/getMessages'
import saveGenerations from './db/saveGenerations'
import { DesighBrief } from "./models/logoapp";

require('dotenv').config();

const JUAND4BOT_NUMBER = process.env.JUAND4BOT_NUMBER;
const JD_NUMBER = process.env.JD_NUMBER;
const respondedToMessages = new Set();
const BASE_GEN = process.env.BASE_GEN

interface SenderFlows {
  [key: string]: string; // Key is a string, value is a string
}

type RequestPayload = {
  chain: string;
  prompt: any;
};

type textAssets = {
  companyName: string | null,
  domain: string | undefined,
  slogan: string | null,
  tagline: string | null,
  logoPrompt: string | null,
  whyLogo: string | null
}

const senderFlows: SenderFlows = {};

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info_juand4bot')
  logger.level = 'trace'
  
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });
  // this will be called as soon as the credentials are updated
  sock.ev.on("creds.update", saveCreds);
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
    
    if (senderJid === `${JD_NUMBER}@s.whatsapp.net`) {
      console.log(JSON.stringify(receivedMessage))
      console.log(senderJid, 'mgConv', typeof messageConversation, messageConversation, 'mgExt', typeof messageExtended, messageExtended, 'mUser: ', messageUser);
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
      if(!BASE_GEN) return

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
          textAssets = await genChat(payload)
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