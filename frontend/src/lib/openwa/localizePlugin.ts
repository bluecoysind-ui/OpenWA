import type { Plugin, PluginConfigSchema, PluginI18n, PluginI18nLocale } from "../openwa-api";

function localizeConfigSchema(
  schema: PluginConfigSchema | undefined,
  config: PluginI18nLocale["config"] | undefined,
): PluginConfigSchema | undefined {
  if (!schema?.properties || !config || typeof config !== "object") return schema;
  const properties: PluginConfigSchema["properties"] = {};
  for (const [key, field] of Object.entries(schema.properties)) {
    const ov = config[key];
    properties[key] = ov
      ? { ...field, title: ov.title ?? field.title, description: ov.description ?? field.description }
      : field;
  }
  return { ...schema, properties };
}

export function localizePlugin<T extends Pick<Plugin, "name" | "description" | "configSchema" | "i18n">>(
  plugin: T,
  lang: string,
): T {
  const ov = plugin.i18n && typeof plugin.i18n === "object" ? plugin.i18n[lang] : undefined;
  if (!ov || typeof ov !== "object") return plugin;
  return {
    ...plugin,
    name: ov.name ?? plugin.name,
    description: ov.description ?? plugin.description,
    configSchema: localizeConfigSchema(plugin.configSchema, ov.config),
  };
}
