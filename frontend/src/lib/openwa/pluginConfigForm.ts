import type { PluginConfigField } from "../openwa-api";

export function emptyForField(field: PluginConfigField): unknown {
  if (field.default !== undefined) return field.default;
  if (field.enum && field.enum.length > 0) return field.enum[0];
  switch (field.type) {
    case "boolean":
      return false;
    case "array":
      return [];
    case "object": {
      const obj: Record<string, unknown> = {};
      if (field.properties) for (const [k, sub] of Object.entries(field.properties)) obj[k] = emptyForField(sub);
      return obj;
    }
    case "number":
      return undefined;
    default:
      return "";
  }
}

export function coerceFieldInput(field: PluginConfigField, raw: string): unknown {
  if (field.type === "number") return raw === "" ? undefined : Number(raw);
  return raw;
}
