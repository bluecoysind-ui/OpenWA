import { useEffect, useRef, useState } from "react";
import type { InfraStatus, SavedConfig, SaveConfigPayload } from "../openwa-api";

export interface DatabaseConfig {
  type: "sqlite" | "postgres";
  builtIn: boolean;
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  schema: string;
  poolSize: number;
  sslEnabled: boolean;
  sslRejectUnauthorized: boolean;
}

export interface RedisConfig {
  builtIn: boolean;
  host: string;
  port: string;
  password: string;
  connected: boolean;
}

export interface StorageConfig {
  type: "local" | "s3";
  builtIn: boolean;
  localPath: string;
  s3Bucket: string;
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3Endpoint: string;
}

export interface EngineConfig {
  type: string;
  headless: boolean;
  sessionDataPath: string;
  browserArgs: string;
}

export function useInfraConfigForm(infraStatus: InfraStatus | undefined, savedConfig: SavedConfig | undefined) {
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    type: "sqlite",
    builtIn: false,
    host: "localhost",
    port: "5432",
    username: "postgres",
    password: "",
    database: "openwa",
    schema: "public",
    poolSize: 10,
    sslEnabled: false,
    sslRejectUnauthorized: true,
  });
  const [redisConfig, setRedisConfig] = useState<RedisConfig>({
    builtIn: false,
    host: "localhost",
    port: "6379",
    password: "",
    connected: false,
  });
  const [storageConfig, setStorageConfig] = useState<StorageConfig>({
    type: "local",
    builtIn: false,
    localPath: "./data/media",
    s3Bucket: "",
    s3Region: "ap-southeast-1",
    s3AccessKey: "",
    s3SecretKey: "",
    s3Endpoint: "",
  });
  const [engineConfig, setEngineConfig] = useState<EngineConfig>({
    type: "whatsapp-web.js",
    headless: true,
    sessionDataPath: "./data/sessions",
    browserArgs: "--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu",
  });
  const [redisEnabled, setRedisEnabledState] = useState(false);
  const [queueEnabled, setQueueEnabled] = useState(false);
  const formHydrated = useRef(false);
  const engineHydrated = useRef(false);
  const engineTouched = useRef(false);
  const engineTypeKnown = (): boolean => engineHydrated.current || engineTouched.current;

  useEffect(() => {
    if (!infraStatus || formHydrated.current) return;
    setDbConfig((prev) => ({
      ...prev,
      type: (infraStatus.database.type as "sqlite" | "postgres") || "sqlite",
      host: infraStatus.database.host || "localhost",
      builtIn: infraStatus.database.builtIn,
    }));
    setRedisConfig((prev) => ({
      ...prev,
      host: infraStatus.redis.host,
      port: String(infraStatus.redis.port),
      builtIn: infraStatus.redis.builtIn,
    }));
    setRedisEnabledState(infraStatus.redis.enabled);
    setStorageConfig((prev) => ({
      ...prev,
      type: infraStatus.storage.type,
      localPath: infraStatus.storage.path || "./uploads",
      builtIn: infraStatus.storage.builtIn,
    }));
    setQueueEnabled(infraStatus.queue.enabled);
  }, [infraStatus]);

  useEffect(() => {
    if (!savedConfig || formHydrated.current) return;
    setDbConfig((prev) => ({
      ...prev,
      host: savedConfig.database.host || prev.host,
      port: savedConfig.database.port || prev.port,
      username: savedConfig.database.username || prev.username,
      database: savedConfig.database.database || prev.database,
      schema: savedConfig.database.schema || prev.schema,
      poolSize: savedConfig.database.poolSize,
      sslEnabled: savedConfig.database.sslEnabled,
      sslRejectUnauthorized: savedConfig.database.sslRejectUnauthorized,
    }));
    setRedisConfig((prev) => ({
      ...prev,
      host: savedConfig.redis.host || prev.host,
      port: savedConfig.redis.port || prev.port,
    }));
    setStorageConfig((prev) => ({
      ...prev,
      localPath: savedConfig.storage.localPath || prev.localPath,
      s3Bucket: savedConfig.storage.s3Bucket || prev.s3Bucket,
      s3Region: savedConfig.storage.s3Region || prev.s3Region,
      s3Endpoint: savedConfig.storage.s3Endpoint || prev.s3Endpoint,
    }));
    setEngineConfig((prev) => ({
      ...prev,
      headless: savedConfig.engine.headless,
      sessionDataPath: savedConfig.engine.sessionDataPath || prev.sessionDataPath,
      browserArgs: savedConfig.engine.browserArgs || prev.browserArgs,
    }));
  }, [savedConfig]);

  useEffect(() => {
    if (infraStatus && savedConfig) formHydrated.current = true;
  }, [infraStatus, savedConfig]);

  useEffect(() => {
    const seed = savedConfig?.engine.type;
    if (!seed || engineHydrated.current || engineTouched.current) return;
    engineHydrated.current = true;
    setEngineConfig((prev) => (prev.type === seed ? prev : { ...prev, type: seed }));
  }, [savedConfig]);

  const updateDbConfig = (key: keyof DatabaseConfig, value: string | number | boolean) =>
    setDbConfig((prev) => ({ ...prev, [key]: value }));
  const updateRedisConfig = (key: keyof RedisConfig, value: string | boolean) =>
    setRedisConfig((prev) => ({ ...prev, [key]: value }));
  const updateStorageConfig = (key: keyof StorageConfig, value: string | boolean) =>
    setStorageConfig((prev) => ({ ...prev, [key]: value }));
  const updateEngineConfig = (key: keyof EngineConfig, value: string | boolean) => {
    if (key === "type") engineTouched.current = true;
    setEngineConfig((prev) => ({ ...prev, [key]: value }));
  };
  const setRedisEnabled = (enabled: boolean) => {
    setRedisEnabledState(enabled);
    if (!enabled) setQueueEnabled(false);
  };
  const setRedisConnected = (connected: boolean) => setRedisConfig((prev) => ({ ...prev, connected }));

  const buildSavePayload = (): SaveConfigPayload => ({
    database: { ...dbConfig },
    redis: {
      enabled: redisEnabled,
      builtIn: redisConfig.builtIn,
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
    },
    queue: { enabled: queueEnabled },
    storage: { ...storageConfig },
    engine:
      engineTypeKnown() &&
      !(engineHydrated.current && !engineTouched.current && infraStatus?.envPinned?.includes("ENGINE_TYPE"))
        ? { ...engineConfig }
        : { ...engineConfig, type: undefined },
  });

  return {
    dbConfig,
    redisConfig,
    storageConfig,
    engineConfig,
    redisEnabled,
    queueEnabled,
    setRedisEnabled,
    setQueueEnabled,
    setRedisConnected,
    updateDbConfig,
    updateRedisConfig,
    updateStorageConfig,
    updateEngineConfig,
    buildSavePayload,
  };
}
