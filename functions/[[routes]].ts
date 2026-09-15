import { handle } from "hono/cloudflare-pages";
import app from "../api/boot";

export const onRequest = handle(app);
