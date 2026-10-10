import dotenv from "dotenv";
import { resolve } from "node:path";
import { ensureTestAdmin } from "./test-admin.js";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });

await ensureTestAdmin();
