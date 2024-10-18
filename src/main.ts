import * as net from "net";
import fs from "fs";

function buildHeaders(headers: string[]) {
  let obj = {} as any;
  headers.forEach((str) => {
    const [key, val] = str.split(" ");
    const formattedKey = key.substring(0, key.length - 1);
    obj = {
      ...obj,
      [formattedKey]: val,
    };
  });
  return obj;
}

let connections = new Set<net.Socket>();

const server = net.createServer((socket) => {
  connections.add(socket);

  socket.on("data", (data) => {
    const request = data.toString();
    const lines = request.split("\r\n");
    const [requestLine, ...headers] = lines;
    const [method, target, version] = requestLine.split(" ");
    const paths = target.split("/").filter(Boolean);
    const [indexRoute, ...subroutes] = paths;

    switch (indexRoute) {
      case undefined:
        socket.write("HTTP/1.1 200 OK\r\n\r\n");
        break;
      case "echo":
        const [content] = subroutes;
        socket.write(
          `HTTP/1.1 200 OK\r\n\Content-Type: text/plain\r\nContent-Length: ${content.length}\r\n\r\n${content}`
        );
        break;
      case "user-agent":
        const headersObj = buildHeaders(headers);
        const userAgent = headersObj["User-Agent"];
        socket.write(
          `HTTP/1.1 200 OK\r\n\Content-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`
        );
        break;
      case "files":
        if (method.toUpperCase() === "GET") {
          const [filename] = subroutes;
          try {
            const data = fs.readFileSync(`./tmp/${filename}`);
            socket.write(
              `HTTP/1.1 200 OK\r\n\Content-Type: text/plain\r\nContent-Length: ${data.length}\r\n\r\n${data}`
            );
          } catch (error) {
            socket.end(`HTTP/1.1 404 Not Found\r\n\r\n`);
          }
        } else if (method.toUpperCase() === "POST") {
          const [filename] = subroutes;
          const body = lines[lines.length - 1];
          if (!filename.trim() || !body.trim()) {
            socket.end(`HTTP/1.1 400 Bad Request\r\n\r\n`);
            break;
          }
          try {
            fs.writeFileSync(`./tmp/${filename}`, body);
            socket.write(`HTTP/1.1 201 Created\r\n\r\n`);
          } catch (error) {
            socket.end(`HTTP/1.1 500 Internal Server Error\r\n\r\n`);
          }
        }
        break;

      default:
        socket.write(`HTTP/1.1 404 Not Found\r\n\r\n`);
    }
  });
  socket.on("connect", () => {
    console.log("Client connected");
    socket.write("HTTP/1.1 200 OK\r\n\r\n");
  });
  socket.on("end", () => {
    console.log("Client disconnected");
  });
  socket.on("error", (err) => {
    console.error("Socket error:", err);
    socket.end(`HTTP/1.1 500 Internal Server Error\r\n\r\n`);
  });
});

console.log("Logs from the program will appear here!");
server.listen(4221, "localhost");
