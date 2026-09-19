import { emptyForField } from "./pluginConfigForm";
import type { Plugin } from "../openwa-api";

export function configUiSafeConfig(plugin: Plugin, sessionId?: string): Record<string, unknown> {
  const props = plugin.configSchema?.properties;
  if (!props) return {};
  const override = sessionId ? (plugin.sessionConfig?.[sessionId] ?? {}) : {};
  return Object.fromEntries(
    Object.keys(props).flatMap((k) => {
      if (sessionId && k in override) return [[k, override[k]]];
      return k in (plugin.config ?? {}) ? [[k, plugin.config![k]]] : [];
    }),
  );
}

export function sparseSessionOverride(full: Record<string, unknown>, plugin: Plugin): Record<string, unknown> {
  const props = plugin.configSchema?.properties;
  if (!props) return full;
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(props)) {
    if (!(key in full)) continue;
    const val = full[key];
    if (field.secret) {
      out[key] = val;
      continue;
    }
    if (JSON.stringify(val) === JSON.stringify(plugin.config?.[key])) continue;
    if (plugin.config?.[key] === undefined && JSON.stringify(val) === JSON.stringify(emptyForField(field))) continue;
    out[key] = val;
  }
  return out;
}

export function missingRequiredConfig(plugin: Plugin): string[] {
  const props = plugin.configSchema?.properties ?? {};
  return Object.entries(props)
    .filter(
      ([key, field]) =>
        field.required === true &&
        (plugin.config?.[key] === undefined || plugin.config?.[key] === null || plugin.config?.[key] === ""),
    )
    .map(([key]) => key);
}
