import { expect, test } from "bun:test";

import {
  MONGO_SRV_DNS_FALLBACK_SERVERS,
  configureMongoSrvDns,
} from "@/lib/db/mongo-dns";

test("uses public DNS fallback for Atlas SRV lookup on Windows", () => {
  const calls: string[][] = [];

  expect(
    configureMongoSrvDns({
      platform: "win32",
      uri: "mongodb+srv://user:pass@cluster.example.mongodb.net/",
      setServers: (servers) => calls.push(servers),
    }),
  ).toBe(true);

  expect(calls).toEqual([[...MONGO_SRV_DNS_FALLBACK_SERVERS]]);
});

test("does not change DNS for non-SRV URIs or non-Windows runtimes", () => {
  const calls: string[][] = [];

  expect(
    configureMongoSrvDns({
      platform: "linux",
      uri: "mongodb+srv://user:pass@cluster.example.mongodb.net/",
      setServers: (servers) => calls.push(servers),
    }),
  ).toBe(false);

  expect(
    configureMongoSrvDns({
      platform: "win32",
      uri: "mongodb://localhost:27017",
      setServers: (servers) => calls.push(servers),
    }),
  ).toBe(false);

  expect(calls).toEqual([]);
});
