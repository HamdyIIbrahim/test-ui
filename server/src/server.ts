import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import dotenv from 'dotenv';
import Airtable from 'airtable';
import Y from 'yjs';
import { syncedStore, getYjsValue } from "@syncedstore/core";
import * as fs from 'fs';
import * as path from 'path';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
dotenv.config();

const PORT = process.env.PORT || 8000;
app.use(cors());
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

  conn.on('message', async (message: any) => {
    console.log(message.toString(), typeof message, message);
    try {
      if (!baseId || !tableId || !recordId) return;
      let fieldId = undefined;
      let value = undefined;

      try {
        if (message instanceof ArrayBuffer) {
          const uint8Array = new Uint8Array(message);
          const decodedMessage = new TextDecoder('utf-8').decode(message);
          let parsedMessage = JSON.parse(decodedMessage);
          fieldId = parsedMessage.fieldId;
          value = parsedMessage.value;
          console.log(`Received message1: ${decodedMessage}`);
        } else if (message instanceof Buffer) {
          const decoder = new TextDecoder('utf-8');
          const stringMessage = decoder.decode(message);
          if (stringMessage === 'fetch') {
            const record = await base(tableId).find(recordId);
            const recordData = { ...record.fields };
            Object.keys(recordData).forEach((key) => {
              store.airtableData[key] = recordData[key];
            });
            console.log('Fetched record:', recordData);
      
            // Send the Airtable data to the client
            conn.send(JSON.stringify(recordData));
          }
        }else {
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
        // const record = await base(tableId).find(recordId);
        // console.log('record', JSON.stringify({ fields: record.fields }));
        // conn.send(JSON.stringify(record.fields));

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
interface ConfigData {
  [key: string]: any; // Define as per the expected structure of config.json
  base?: string;
  table?: string;
  view?: string;
}

// Function to recursively read directories and find all config.json files
function readConfigFilesRecursively(dir: string): ConfigData[] {
  const results: ConfigData[] = [];

  // Read the current directory
  const files = fs.readdirSync(dir);
  files.forEach((file: string) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // If the item is a directory, recursively read it
      results.push(...readConfigFilesRecursively(fullPath));
    } else if (file === 'config.json') {
      // If a config.json is found, read its content
      const content = fs.readFileSync(fullPath, 'utf8');
      let configData: ConfigData;

      try {
        configData = JSON.parse(content) as ConfigData;
      } catch (error) {
        console.error(`Error parsing JSON from file ${fullPath}:`, error);
        return; // Skip invalid JSON
      }

      // Extract base, table, view from the file path
      const pathSegments = fullPath.split(path.sep);
      const [base, table, view] = pathSegments.slice(-4, -1); // Adjust slicing depending on depth

      // Add the base, table, view information to the config data
      const enrichedConfig: ConfigData = {
        base,
        table,
        view,
        viewConfig: {...configData}
      };

      results.push(enrichedConfig);
    }
  });

  return results;
}
app.get('/api/configs', (req, res) => {
  const rootConfigDir = path.join(__dirname, 'config'); 
  const allConfigs: ConfigData[] = readConfigFilesRecursively(rootConfigDir);
  res.send(allConfigs);
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
