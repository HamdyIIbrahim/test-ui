import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8000;

wss.on('connection', (conn, req) => {
    console.log('New WebSocket connection');
  setupWSConnection(conn, req, { docName: 'form-synced-store' });
  conn.on('message', (message: ArrayBuffer) => {
    // Convert ArrayBuffer to string
    // const decoder = new TextDecoder('utf-8');
    // const decodedMessage = decoder.decode(message);

    // Log the received message
    // console.log('Received:', decodedMessage + ' ' + new Date().getTime());

    // If the message is JSON, parse it
    // try {
    //   const jsonMessage = JSON.parse(decodedMessage);
    //   console.log('Parsed JSON:', jsonMessage);
    // } catch (e) {
    //   console.log('Message is not JSON:', decodedMessage);
    // }
    if (message instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(message);
        const decodedMessage = new TextDecoder().decode(uint8Array);
        console.log(`Received message: ${decodedMessage}`);
    } else {
        console.log(`Received message: ${message}`);
    }
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
