import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    url: process.env.DATABASE_URL || "postgresql://xfactory:xfactory_dev@localhost:5432/xfactory",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "development-jwt-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  xrpl: {
    network: process.env.XRPL_NETWORK || "testnet",
    wsUrl: process.env.XRPL_WS_URL || "wss://s.altnet.rippletest.net:51233",
    jsonRpcUrl: process.env.XRPL_JSON_RPC_URL || "https://s.altnet.rippletest.net:51234/",
  },

  rlusd: {
    issuer: process.env.RLUSD_ISSUER || "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV",
    currency: process.env.RLUSD_CURRENCY || "USD",
  },

  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  encryptionKey: process.env.ENCRYPTION_KEY || "development-key-do-not-use-in-production",

  rippleEpochOffset: 946684800,

  escrow: {
    defaultCancelAfterDays: 30,
    defaultFinishAfterDays: 0,
  },
} as const;

export function validateConfig(): void {
  if (config.nodeEnv === "production") {
    const required = ["DATABASE_URL", "JWT_SECRET", "XRPL_WS_URL", "RLUSD_ISSUER", "ENCRYPTION_KEY"];

    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    if (config.jwt.secret === "development-jwt-secret") {
      throw new Error("JWT_SECRET must be set in production");
    }

    if (config.encryptionKey === "development-key-do-not-use-in-production") {
      throw new Error("ENCRYPTION_KEY must be set in production");
    }
  }
}

export default config;
