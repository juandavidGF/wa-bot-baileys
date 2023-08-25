import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import logger from "./utils/logger";
import { delay } from "./utils/delay";
require('dotenv').config();

const JUAND4BOT_NUMBER = process.env.JUAND4BOT_NUMBER;
const JD_NUMBER = process.env.JD_NUMBER;
const respondedToMessages = new Set();

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
  // sock.ev.on("messages.upsert", ({ message }) => {
  //   console.log("got messages", m);
  //   console.log(JSON.stringify(m, undefined, 2));

  //   console.log(m[0].message);
  // });
  sock.ev.on("messages.upsert", async (m) => {
    const receivedMessage = m.messages[0];
    const senderJid = receivedMessage.key.remoteJid;

    if (senderJid === `${JD_NUMBER}@s.whatsapp.net` && !respondedToMessages.has(senderJid)) {
      // console.log(JSON.stringify(m, undefined, 2));
      console.log("Received message from", senderJid);

      respondedToMessages.add(senderJid);

      await sock.sendMessage(senderJid, {
        text: "Hello there!",
      });

      await delay(3_000);
      // Remove sender from respondedToMessages set to allow responses again
      respondedToMessages.delete(senderJid);
    }
  });
}

// send a simple text!
// run in main file
connectToWhatsApp();