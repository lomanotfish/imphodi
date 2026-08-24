import dns from "node:dns";

export const MONGO_SRV_DNS_FALLBACK_SERVERS = ["1.1.1.1", "8.8.8.8"] as const;

interface ConfigureMongoSrvDnsOptions {
  uri?: string;
  platform?: NodeJS.Platform;
  setServers?: (servers: string[]) => void;
}

export function configureMongoSrvDns({
  uri = process.env.MONGODB_URI,
  platform = process.platform,
  setServers = dns.setServers,
}: ConfigureMongoSrvDnsOptions = {}): boolean {
  if (platform !== "win32" || !uri?.startsWith("mongodb+srv://")) {
    return false;
  }

  setServers([...MONGO_SRV_DNS_FALLBACK_SERVERS]);
  return true;
}
