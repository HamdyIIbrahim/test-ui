import { syncedStore, getYjsDoc } from "@syncedstore/core";
import { WebsocketProvider } from "y-websocket";
import { Awareness } from 'y-protocols/awareness';

// Define initial form data
type InitFormData = { [key: string]: string; };

// Create the SyncedStore store
export const store = syncedStore({ formData: {} as InitFormData });

// Get the Yjs document
const doc = getYjsDoc(store);
const awareness = new Awareness(doc);
export const yMap = doc.getMap('formData');

let wsProvider: WebsocketProvider | null = null;

export const initializeProvider = (baseId: string, tableId: string, recordId: string) => {
    const roomName = `airtable-room-${baseId}-${tableId}-${recordId}`;
    wsProvider = new WebsocketProvider("ws://localhost:8000", roomName, doc, { awareness });
    
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