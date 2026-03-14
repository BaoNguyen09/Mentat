declare module "ws" {
  import type { IncomingMessage } from "node:http";
  import type { Socket } from "node:net";

  export type RawData =
    | string
    | Buffer
    | ArrayBuffer
    | SharedArrayBuffer
    | ArrayBufferView
    | Buffer[];

  export class WebSocket {
    static readonly OPEN: number;

    readyState: number;

    send(data: string): void;
    close(): void;
    on(event: "message", listener: (data: RawData) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
  }

  export class WebSocketServer {
    constructor(options: { noServer?: boolean });
    handleUpgrade(
      request: IncomingMessage,
      socket: Socket,
      head: Buffer,
      callback: (websocket: WebSocket) => void,
    ): void;
  }
}
