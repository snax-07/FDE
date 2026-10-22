import fastify from 'fastify';
import { registerPlugins } from './bootstrap/register-plugins';
import registerRoutes from './bootstrap/register-routes';

const app = fastify({
    logger : true,
    trustProxy : true,
    bodyLimit : 5242880,   
});

await registerPlugins(app)
await registerRoutes(app)

app.get("/", async () => {
  return { message: "Server running" };
});

const start = async () => {
  try {
    await app.listen({ port: 8000 });

    const shutdown = async () => {
      app.log.info("Shutting down server...");

      await app.close();

      app.log.info("Server closed safely");
      process.exit(0);
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

export default start;