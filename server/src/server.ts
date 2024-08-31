import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import dotenv from 'dotenv';
import Airtable from 'airtable';
import Y from 'yjs';
import { syncedStore, getYjsValue } from "@syncedstore/core";

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
dotenv.config();

const PORT = process.env.PORT || 8000;

// Initialize Airtable (replace with your Airtable API Key)
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });

// Setup SyncedStore (we'll use this to sync only the relevant data)
const store = new syncedStore({ airtableData: {} });
const ydoc = new Y.Doc();
const yjsValue = getYjsValue(store);

// wss.on('connection', (conn, req) => {
//     console.log('New WebSocket connection');
//   setupWSConnection(conn, req, { docName: 'form-synced-store' });
//   conn.on('message', (message: ArrayBuffer) => {
//     // Convert ArrayBuffer to string
//     // const decoder = new TextDecoder('utf-8');
//     // const decodedMessage = decoder.decode(message);

//     // Log the received message
//     // console.log('Received:', decodedMessage + ' ' + new Date().getTime());

//     // If the message is JSON, parse it
//     // try {
//     //   const jsonMessage = JSON.parse(decodedMessage);
//     //   console.log('Parsed JSON:', jsonMessage);
//     // } catch (e) {
//     //   console.log('Message is not JSON:', decodedMessage);
//     // }
//     if (message instanceof ArrayBuffer) {
//         const uint8Array = new Uint8Array(message);
//         const decodedMessage = new TextDecoder().decode(uint8Array);
//         console.log(`Received message: ${decodedMessage}`);
//     } else {
//         console.log(`Received message: ${message}`);
//     }
//   });
// });

wss.on('connection', (conn, req) => {
    console.log('New WebSocket connection');
  setupWSConnection(conn, req, { docName: 'form-synced-store' });

  const url = new URL(req.url as any, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('-').filter(Boolean);
  
  // Extract path parameters
  const [ , , baseId, tableId, recordId ] = pathParts;
  // conn.baseId = baseId;
  // conn.tableId = tableId;
  // conn.recordId = recordId;

  let currentRoom = `${baseId}-${tableId}-${recordId}`;
  const base = airtable.base(baseId);

  conn.on('message', async (message: ArrayBuffer) => {
    console.log(message.toString(), typeof message, message);
    try {
      if (!baseId || !tableId || !recordId) return;
      let fieldId = undefined;
      let value = undefined;

      try {
        if (message instanceof ArrayBuffer) {
          const uint8Array = new Uint8Array(message);
          const decodedMessage = new TextDecoder().decode(uint8Array);
          let parsedMessage = JSON.parse(decodedMessage);
          fieldId = parsedMessage.fieldId;
          value = parsedMessage.value;
          console.log(`Received message1: ${decodedMessage}`);
        } else {
          let parsedMessage = JSON.parse(message);
          fieldId = parsedMessage.fieldId;
          value = parsedMessage.value;
          console.log(`Received message2: ${message}`);
        }
      } catch (error) {
        console.log('error', error);
      }

      if (fieldId && value) {
        // Update the specific field in Airtable
        await base(tableId).update(recordId, { [fieldId]: value });

        // Notify other clients in the same room about the update
        wss.clients.forEach((client) => {
          if (client !== conn && client.readyState === WebSocket.OPEN && client.room === currentRoom) {
            client.send(JSON.stringify({ fieldId, value }));
          }
        });
      } else {
        // Fetch the record data from Airtable
        const record = await base(tableId).find(recordId);
        console.log('record', JSON.stringify({ fields: record.fields }));
        conn.send(JSON.stringify({ data: record.fields}));

        // Assign the room based on the path parameters
        // conn.room = currentRoom;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      conn.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  conn.on('close', () => {
    console.log(`Connection closed for room: ${conn.roomName}`);
  });
});

// wss.on('connection', (ws: WebSocket) => {
//   console.log('New WebSocket connection');

//   ws.on('message', (message: string) => {
//     console.log('Received:', message + ' ' + new Date().getTime());

//     // Echo the message back to the client
//     ws.send(`Server received: ${message}`);
//   });

//     ws.on('close', () => {
//       console.log('WebSocket connection closed');
//     });

//   // Send a welcome message
//   ws.send('Welcome to the WebSocket server!');
// });

// Basic route for HTTP requests
app.get('/', (req, res) => {
  res.send('WebSocket server is running. Connect using a WebSocket client.');
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// // Polling for updates and sending to specific rooms (optional for real-time sync)
// setInterval(async () => {
//   wss.clients.forEach(async (client) => {
//     if (client.readyState === WebSocket.OPEN && client.room) {
//       const [baseId, tableId, recordId] = client.room.split('-');
//       const base = airtable.base(baseId);

//       const record = await base(tableId).find(recordId);
//       console.log('record1', JSON.stringify({ fields: record.fields }));
//       const data = JSON.stringify({ fields: record.fields });

//       // Send the updated data only to clients in the same room
//       client.send(data);
//     }
//   });
// }, 5000); // Poll every 5 seconds
