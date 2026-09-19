import { useState } from "react";
import { saveInfraConfig, type SaveConfigPayload } from "../openwa-api";
import { useAppToast } from "./useToast";

export function useConfigSave({
  buildPayload,
  onSaved,
}: {
  buildPayload: () => SaveConfigPayload;
  onSaved: (profiles: string[]) => void;
}) {
  const toast = useAppToast();
  const [saving, setSaving] = useState(false);
  const [savePending, setSavePending] = useState(false);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const result = await saveInfraConfig(buildPayload());
      if (result.saved) {
        setSavePending(true);
        onSaved(result.profiles || []);
      } else {
        toast.error("Save failed", result.message);
      }
    } catch (err) {
      toast.error("Save failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return { saving, savePending, saveConfig };
}
