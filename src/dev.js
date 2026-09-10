const { createServer: createApiServer } = require("./server");

const host = "127.0.0.1";
const apiPort = 3000;

async function listen(server, port) {
  await new Promise((resolve, reject) => {
    const onError = error => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

async function main() {
  const api = createApiServer();

  try {
    await listen(api, apiPort);
  } catch (error) {
    console.error(
      error.code === "EADDRINUSE"
        ? `Port ${apiPort} is already in use. Stop the other server and try again.`
        : `Could not start the API server: ${error.message}`
    );
    process.exitCode = 1;
    return;
  }

  console.log(`API server ready at http://${host}:${apiPort}`);

  try {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer();
    await vite.listen();
    vite.printUrls();
  } catch (error) {
    await new Promise(resolve => api.close(resolve));
    throw error;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
