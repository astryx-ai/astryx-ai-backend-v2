import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { ENV } from "../../config/env";
import fs from "fs";

type MessageServiceClient = any;

let clientInstance: MessageServiceClient | null = null;

function loadChatProto() {
  let protoPath = path.resolve(__dirname, "../../proto/message.proto");
  if (!fs.existsSync(protoPath)) {
    // Fallbacks for different build layouts
    const candidates = [
      path.resolve(process.cwd(), "backend/server/proto/message.proto"),
      path.resolve(process.cwd(), "server/proto/message.proto"),
      path.resolve(__dirname, "../../../proto/message.proto"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        protoPath = p;
        break;
      }
    }
  }
  if (!fs.existsSync(protoPath)) {
    throw new Error(
      `chat.proto not found. Checked starting at ${path.resolve(
        __dirname,
        "../../proto/chat.proto"
      )}`
    );
  }
  const packageDef = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDef) as any;
  return proto.message;
}

export function getGrpcClient(): MessageServiceClient {
  if (clientInstance) return clientInstance;
  const chatPkg = loadChatProto();
  const target = ENV.GRPC_TARGET;
  if (!target) {
    // Surface a clear error early
    throw new Error("GRPC_TARGET is not set (e.g., '127.0.0.1:50051')");
  }
  // Basic visibility for troubleshooting
  // eslint-disable-next-line no-console
  console.log(`[gRPC] Connecting to ${target}`);
  clientInstance = new chatPkg.MessageService(
    target,
    grpc.credentials.createInsecure()
  );
  return clientInstance;
}

export function messageStream(request: {
  query: string;
  user_id: string;
  chat_id: string;
}) {
  const client = getGrpcClient();
  return client.MessageStream(request);
}
