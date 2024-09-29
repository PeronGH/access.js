export type Stream = {
    readable: ReadableStream<Uint8Array>;
    writeable: WritableStream<Uint8Array>;
};

const EOF_MESSAGE = "Unexpected EOF";

export async function ws2stream(ws: WebSocket): Promise<Stream> {
    // Make sure the WebSocket is opened
    switch (ws.readyState) {
        case ws.CLOSING, ws.CLOSING:
            throw new Error("WebSocket is already closed");
        case ws.CONNECTING:
            await new Promise((resolve, reject) => {
                ws.addEventListener("error", reject);
                ws.addEventListener("open", () => {
                    ws.removeEventListener("error", reject);
                    resolve(null);
                }, { once: true });
            });
    }

    ws.binaryType = "arraybuffer";

    let isReadableClosed = false, isWriteableClosed = false;
    const tryClose = () => {
        if (isReadableClosed && isWriteableClosed) {
            ws.close();
        }
    };

    const readable = new ReadableStream({
        type: "bytes",
        cancel() {
            isReadableClosed = true;
            tryClose();
        },

        start(controller) {
            ws.addEventListener("message", ({ data }) => {
                controller.enqueue(new Uint8Array(data));
            });
            ws.addEventListener("error", (e) => {
                if (e instanceof ErrorEvent && e.message === EOF_MESSAGE) {
                    controller.close();
                    return;
                }
                controller.error(e);
            });
        },
    });

    const writeable = new WritableStream({
        abort() {
            isWriteableClosed = true;
            tryClose();
        },
        close() {
            isWriteableClosed = true;
            tryClose();
        },

        write(chunk) {
            ws.send(chunk);
        },
    });

    return {
        readable,
        writeable,
    };
}
