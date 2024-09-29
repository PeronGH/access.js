import { ws2stream } from "./stream.ts";

const wsUrl = Deno.args.at(0);
if (!wsUrl) {
    console.error("Usage: deno run -A client.ts wss://hostname");
    Deno.exit(1);
}

const ws = new WebSocket(wsUrl);

const { readable, writeable } = await ws2stream(ws);

ws.onclose = () => {
    Deno.exit();
};

await Promise.all([
    readable.pipeTo(Deno.stdout.writable),
    Deno.stdin.readable.pipeTo(writeable),
]);
