const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
const hosts = {};

console.log("Server is running...");

wss.on('connection', (ws) => {
    ws.on('message', (message, isBinary) => {
        if (!isBinary) {
            const text = message.toString();
            
            if (text.startsWith("HOST:")) {
                const pcName = text.substring(5);
                hosts[pcName] = ws;
                ws.pcName = pcName;
                console.log(`Host registered: ${pcName}`);
            } 
            else if (text === "LIST") {
                ws.send("HOSTS:" + Object.keys(hosts).join(","));
            } 
            else if (text.startsWith("CONNECT:")) {
                const pcName = text.substring(8);
                const hostWs = hosts[pcName];
                if (hostWs) {
                    ws.target = hostWs;
                    hostWs.target = ws;
                    ws.send("CONNECTED");
                    console.log(`Client connected to ${pcName}`);
                } else {
                    ws.send("HOST_NOT_FOUND");
                    ws.close();
                }
            }
            // FORWARD CONTROL MESSAGES (FPS/Quality) TO THE TARGET
            else if (ws.target && ws.target.readyState === 1) {
                ws.target.send(text, { binary: false });
            }
        } else {
            // Binary data (Screen frames). Forward to the paired connection.
            if (ws.target && ws.target.readyState === 1) {
                ws.target.send(message, { binary: true });
            }
        }
    });

    ws.on('close', () => {
        if (ws.pcName) {
            delete hosts[ws.pcName];
            console.log(`Host disconnected: ${ws.pcName}`);
        }
        if (ws.target) {
            ws.target.close();
        }
    });
});
