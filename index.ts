import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import logger from "./utils/logger";
import { delay } from "./utils/delay";
require('dotenv').config();

const JUAND4BOT_NUMBER = process.env.JUAND4BOT_NUMBER;
const JD_NUMBER = process.env.JD_NUMBER;
const respondedToMessages = new Set();

interface SenderFlows {
  [key: string]: string; // Key is a string, value is a string
}

const senderFlows: SenderFlows = {};

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
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

    if (typeof senderJid !== 'string') return

    if (!senderFlows[senderJid]) {
      senderFlows[senderJid] = 'initial';
    }
    // console.log("Received message from", senderJid);
    // console.log(JSON.stringify(receivedMessage))
    

    // if ((senderJid === `${JD_NUMBER}@s.whatsapp.net`) &&
    if(!respondedToMessages.has(senderJid) && 
    messageConversation === '/brandx' &&
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

      setTimeout(() => {
        if(typeof senderJid === 'string') sock.sendMessage(senderJid, {
          text: "ok, recived",
        });
        senderFlows[senderJid] = 'product';
      }, 2_500)

      setTimeout(() => {
        respondedToMessages.delete(senderJid);
      }, 3_500)
    }
    
  });
}

connectToWhatsApp();