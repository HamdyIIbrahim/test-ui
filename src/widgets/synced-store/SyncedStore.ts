import { syncedStore, getYjsDoc } from "@syncedstore/core";
import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";

type InitFormData = { data: string; };

// Create your SyncedStore store
export const store = syncedStore({ formData: {} as InitFormData });

// Get the Yjs document and sync automatically using y-webrtc
const doc = getYjsDoc(store);
// const webrtcProvider = new WebrtcProvider("form-synced-store", doc);
export const wsProvider = new WebsocketProvider("ws://localhost:3000/api/socket", "form-synced-store", doc);

// export const disconnect = () => webrtcProvider.disconnect();
// export const connect = () => webrtcProvider.connect();