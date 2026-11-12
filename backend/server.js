import dotenv from "dotenv";
import { createApp } from "./app.js";
import { createPool } from "./db.js";

dotenv.config();

const port = Number(process.env.PORT || 5000);
const app = createApp({ pool: createPool() });
console.log(`Loaded ${(process.env.API_KEYS || "").split(",").filter(Boolean).length} API key(s)`); // the count, never the keys

app.listen(port, () => {
  console.log(`PharmaLink API running on http://localhost:${port}`);
});
