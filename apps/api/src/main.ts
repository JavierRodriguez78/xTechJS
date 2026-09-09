import "reflect-metadata";
import { startApplication } from "./app.js";

startApplication().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});