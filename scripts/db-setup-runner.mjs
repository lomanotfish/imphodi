import dns from "node:dns";

import { createJiti } from "jiti";

// Windows' Node DNS backend can reject Atlas SRV lookups even when the
// operating system resolver succeeds. Use public resolvers for this CLI only.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const jiti = createJiti(import.meta.url);

await jiti.import("./db-setup.ts");
