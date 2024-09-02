import { syncedStore, getYjsDoc } from "@syncedstore/core";
import { WebsocketProvider } from "y-websocket";
import { Awareness } from 'y-protocols/awareness';

// Define initial form data
type InitFormData = { [key: string]: string; };
interface ConfigData {
    base?: string;
    table?: string;
    view?: string;
    [key: string]: any;
  }

// Create the SyncedStore store
export const store = syncedStore({ formData: {} as InitFormData, configData: {} as ConfigData });

// Get the Yjs document
const doc = getYjsDoc(store);
const awareness = new Awareness(doc);
export const yMap = doc.getMap('formData');

let wsProvider: WebsocketProvider | null = null;

export const initializeProvider = async (baseId: string, tableId: string, recordId: string) => {
    const roomName = `airtable-room-${baseId}-${tableId}-${recordId}`;
    wsProvider = new WebsocketProvider("ws://localhost:8000", roomName, doc, { awareness });

    const fetchConfigs = async () => {
        try {
          const response = await fetch('http://localhost:8000/api/configs');;
          if (!response.ok) {
            throw new Error(`Error fetching configs: ${response.statusText}`);
          }
          const data: ConfigData[] = await response.json();
  
          // If the component is still mounted, update the SyncedStore
            data.forEach((config) => {
              // Update the SyncedStore with the fetched data
              if(config.base === baseId && config.table === tableId) {
                Object.assign(store.configData, config);
              }
            });
        } catch (err) {
          console.error('Error fetching configs:', err);
        }
      };
  
      await fetchConfigs();
    
    // Fetch the initial data by sending a 'fetch' message
    wsProvider.ws.onopen = () => {
      console.log('WebSocket connected');
      wsProvider.ws.send('fetch');
    };

    wsProvider.ws.onmessage = (event) => {
        let messageData: any;
        try {
            if (event.data instanceof ArrayBuffer) {
                const textData = new TextDecoder().decode(new Uint8Array(event.data));
                // messageData = JSON.parse(textData);
            } else {
                messageData = JSON.parse(event.data);
            }
            console.log('Received data from WebSocket:', messageData);

            if (messageData) {
                // let yFormData = store.formData as any;
                // // store.formData = { ...store.formData, ...messageData };
                Object.keys(messageData).forEach((key) => {
                    yMap.set(key, messageData[key]);
                    // store.formData[key] = messageData[key];
                });
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }
    // Log WebSocket status
    wsProvider.on('status', (event: any) => {
      console.log('WebSocket status:', event.status);
    });

    wsProvider.on('sync', (isSynced: boolean) => {
        console.log('Data sync status:', isSynced);
    });
  };
  
export const disconnectProvider = () => {
  wsProvider?.destroy();
  wsProvider = null;
};