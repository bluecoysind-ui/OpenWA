import { useEffect, useRef, useState } from "react";
import { getReadyHealth, restartInfra } from "../openwa-api";
import { restartPollAttempts } from "./restartPoll";

export type RestartStatus = "idle" | "restarting" | "waiting" | "success" | "error";

export function useRestartFlow() {
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restartCountdown, setRestartCountdown] = useState(0);
  const [restartStatus, setRestartStatus] = useState<RestartStatus>("idle");
  const [profiles, setProfiles] = useState<{ pending: string[]; previous: string[] }>({ pending: [], previous: [] });
  const [dbSwitch, setDbSwitch] = useState(false);
  const [storageSwitch, setStorageSwitch] = useState(false);
  const pollTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pollTimeouts = pollTimeoutsRef.current;
    return () => {
      for (const handle of pollTimeouts) clearTimeout(handle);
      pollTimeouts.clear();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  const schedulePollTimeout = (fn: () => void, ms: number) => {
    const handle = setTimeout(() => {
      pollTimeoutsRef.current.delete(handle);
      fn();
    }, ms);
    pollTimeoutsRef.current.add(handle);
  };

  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const open = ({
    profiles: newProfiles,
    dbSwitch: nextDbSwitch,
    storageSwitch: nextStorageSwitch,
  }: {
    profiles: string[];
    dbSwitch: boolean;
    storageSwitch: boolean;
  }) => {
    setProfiles((prev) => ({ previous: prev.pending, pending: newProfiles }));
    setDbSwitch(nextDbSwitch);
    setStorageSwitch(nextStorageSwitch);
    setShowRestartModal(true);
  };

  const close = () => {
    if (restartStatus === "idle") setShowRestartModal(false);
  };

  const checkServerHealth = (estimatedTime?: number) => {
    let attempts = 0;
    const maxAttempts = restartPollAttempts(estimatedTime);
    const check = async () => {
      try {
        await getReadyHealth();
        stopCountdown();
        setRestartCountdown(0);
        setRestartStatus("success");
        schedulePollTimeout(() => window.location.reload(), 2000);
      } catch {
        attempts++;
        if (attempts < maxAttempts) schedulePollTimeout(check, 1000);
        else setRestartStatus("error");
      }
    };
    schedulePollTimeout(check, 3000);
  };

  const start = async () => {
    setRestartStatus("restarting");
    setRestartCountdown(30);
    const profilesToRemove = profiles.previous.filter((p) => !profiles.pending.includes(p));
    let estimatedTime: number | undefined;
    try {
      const response = await restartInfra(profiles.pending, profilesToRemove);
      estimatedTime = response.estimatedTime;
      if (response.estimatedTime) setRestartCountdown(response.estimatedTime);
    } catch {
      /* server shutting down */
    }
    setRestartStatus("waiting");
    stopCountdown();
    countdownIntervalRef.current = setInterval(() => {
      setRestartCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    checkServerHealth(estimatedTime);
  };

  return {
    showRestartModal,
    restartCountdown,
    restartStatus,
    pendingProfiles: profiles.pending,
    previousProfiles: profiles.previous,
    dbSwitch,
    storageSwitch,
    open,
    close,
    start,
  };
}
