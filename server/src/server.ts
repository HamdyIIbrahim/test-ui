import express from 'express';
import http from 'http';
import * as WebSocket from 'ws';
import dotenv from 'dotenv';
import Airtable from 'airtable';
import { syncedStore, getYjsValue } from "@syncedstore/core";
import * as fs from 'fs';
import * as path from 'path';
import cors from 'cors';
import { Doc } from 'yjs';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
dotenv.config();

const PORT = process.env.PORT || 8000;
app.use(cors());
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
// Setup SyncedStore (we'll use this to sync only the relevant data)
const store = new syncedStore({ airtableData: {} });

wss.on('connection', (conn, req) => {
  console.log('New WebSocket connection');

  const url = new URL(req.url as any, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('-').filter(Boolean);
  const [ , , baseId, tableId, recordId ] = pathParts;

  let currentRoom = `${baseId}-${tableId}-${recordId}`;
  const base = airtable.base(baseId);
  const broadcastData = (data: any) => {
    if (data === undefined) return;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && currentRoom) {
        conn.send(JSON.stringify({type: 'fetchedData', recordData: data}));
      }
    });
  };

  let pollInterval = process.env.POLL_INTERVAL ? parseInt(process.env.POLL_INTERVAL) : 10000; // 10 seconds
  airtable.base(baseId).table(tableId).find(recordId).then((recordData) => {
      broadcastData(recordData?.fields);
  });
  setInterval(async () => {
    airtable.base(baseId).table(tableId).find(recordId).then((recordData) => {
        broadcastData(recordData?.fields);
    });
  }, pollInterval);

  conn.on('message', async (message: any) => {
    // console.log(message);
    try {
      if (!baseId || !tableId || !recordId) return;
      let fieldId = undefined;
      let value = undefined;

      try {
        let decodedMessage = new TextDecoder().decode(new Uint8Array(message));
        console.log('Decoded message:', decodedMessage);
        const parsedMessage = JSON.parse(decodedMessage);

        if (parsedMessage && parsedMessage.type) {
          if (parsedMessage.type == 'fetch') {
            const record = await base(tableId).find(recordId);
            const recordData = { ...record.fields };
            Object.keys(recordData).forEach((key) => {
              store.airtableData[key] = recordData[key];
            });
            console.log('Fetched record:', recordData);
            // Send the Airtable data to the client
            conn.send(JSON.stringify({type: 'fetchedData', recordData}));
          } else if (parsedMessage.type === 'updateField') {
            fieldId = parsedMessage.fieldId;
            value = parsedMessage.value;
            console.log(`Received message1: ${decodedMessage}`);
          }
        }
      } catch (error) {
        console.log('error', error);
      }

      if (fieldId && value) {
        console.log(fieldId, value)
        // Update the specific field in Airtable
        await base(tableId).update(recordId, { [fieldId]: value });

        // Notify other clients in the same room about the update
        wss.clients.forEach((client) => {
          console.log(client.readyState, client.readyState === WebSocket.OPEN, currentRoom);
          if (client.readyState === WebSocket.OPEN &&  currentRoom) {
            client.send(JSON.stringify({ type: 'updatedField', fieldId, value }));
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
    console.log(`Connection closed for room: ${currentRoom}`);
  });
});

function getOrCreateDocForRoom(roomId: string): Doc {
  // Implement logic to return an existing document or create a new one for the room
  console.log('documents', documents);
  if (!documents[roomId]) {
    documents[roomId] = new Doc();
  }
  return documents[roomId];
}

const documents: Record<string, Doc> = {};

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
        viewConfig: {...configData.viewConfig},
        uiSchema: {...configData.uiSchema}
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
