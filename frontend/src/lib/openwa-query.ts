import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./openwa-api";
import { getOwnProfile } from "./openwa/akg-api";

export const queryKeys = {
  sessions: ["openwa", "sessions"] as const,
  sessionStats: ["openwa", "session-stats"] as const,
  sessionConfig: (id: string) => ["openwa", "session-config", id] as const,
  sessionProxy: (id: string) => ["openwa", "session-proxy", id] as const,
  chats: (sessionId: string) => ["openwa", "chats", sessionId] as const,
  messages: (sessionId: string, chatId: string) => ["openwa", "messages", sessionId, chatId] as const,
  contacts: (sessionId: string) => ["openwa", "contacts", sessionId] as const,
  groups: (sessionId: string) => ["openwa", "groups", sessionId] as const,
  webhooks: ["openwa", "webhooks"] as const,
  templates: (sessionId: string) => ["openwa", "templates", sessionId] as const,
  apiKeys: ["openwa", "api-keys"] as const,
  logs: (params: { severity?: string; page: number }) => ["openwa", "logs", params] as const,
  infra: ["openwa", "infra"] as const,
  infraConfig: ["openwa", "infra-config"] as const,
  health: ["openwa", "health"] as const,
  plugins: ["openwa", "plugins"] as const,
  pluginCatalog: ["openwa", "plugin-catalog"] as const,
  pluginInstances: (pluginId: string) => ["openwa", "plugin-instances", pluginId] as const,
  pluginConfigUi: (id: string) => ["openwa", "plugin-config-ui", id] as const,
  engines: ["openwa", "engines"] as const,
  currentEngine: ["openwa", "current-engine"] as const,
  statsOverview: ["openwa", "stats-overview"] as const,
  statsMessages: (period: api.StatsPeriod) => ["openwa", "stats-messages", period] as const,
  batch: (sessionId: string, batchId: string) => ["openwa", "batch", sessionId, batchId] as const,
  profilePicture: (sessionId: string, contactId: string) => ["openwa", "profile-picture", sessionId, contactId] as const,
  profilePictures: (sessionId: string, idsKey: string) => ["openwa", "profile-pictures", sessionId, idsKey] as const,
  contact: (sessionId: string, contactId: string) => ["openwa", "contact", sessionId, contactId] as const,
};

export function useSessionsQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.sessions, queryFn: api.listSessions, enabled, staleTime: 15_000 });
}

export function useSessionStatsQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.sessionStats, queryFn: api.getSessionStats, enabled, staleTime: 15_000, retry: false });
}

export function useSessionConfigQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sessionConfig(sessionId),
    queryFn: () => api.getSessionConfig(sessionId),
    enabled: enabled && Boolean(sessionId),
  });
}

export function useSessionProxyQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sessionProxy(sessionId),
    queryFn: () => api.getSessionProxy(sessionId),
    enabled: enabled && Boolean(sessionId),
  });
}

export function useContactQuery(sessionId: string | undefined, contactId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contact(sessionId ?? "", contactId ?? ""),
    queryFn: () => api.getContact(sessionId!, contactId!),
    enabled: Boolean(sessionId && contactId),
    staleTime: 10 * 60 * 1000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useProfilePicture(sessionId: string | undefined, contactId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profilePicture(sessionId ?? "", contactId ?? ""),
    queryFn: () => api.getProfilePicture(sessionId!, contactId!).then((r) => r.url),
    enabled: Boolean(sessionId && contactId),
    staleTime: 60 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useResolvedPhone(sessionId: string | undefined, contactId: string | undefined) {
  return useQuery({
    queryKey: ["openwa", "resolved-phone", sessionId ?? "", contactId ?? ""],
    queryFn: () => api.resolveContactPhone(sessionId!, contactId!).then((r) => r.phone),
    enabled: Boolean(sessionId && contactId),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}

export function useOwnProfiles(sessionIds: string[]) {
  const ids = sessionIds.filter(Boolean);
  const results = useQueries({
    queries: ids.map((sessionId) => ({
      queryKey: ["openwa", "own-profile", sessionId] as const,
      queryFn: () => getOwnProfile(sessionId),
      enabled: Boolean(sessionId),
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: false,
    })),
  });
  const byId: Record<string, { pushName?: string; pictureUrl?: string | null }> = {};
  ids.forEach((id, i) => {
    const data = results[i]?.data;
    if (data) byId[id] = { pushName: data.pushName ?? undefined, pictureUrl: data.profilePictureUrl };
  });
  return byId;
}

export function useProfilePictures(sessionId: string | undefined, contactIds: string[]) {
  const requestIds = contactIds.slice(0, 50);
  const sortedKey = [...requestIds].sort().join(",");
  return useQuery({
    queryKey: queryKeys.profilePictures(sessionId ?? "", sortedKey),
    queryFn: () => api.getProfilePictures(sessionId!, requestIds).then((r) => r.pictures),
    enabled: Boolean(sessionId && requestIds.length > 0),
    staleTime: 60 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useChatsQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chats(sessionId),
    queryFn: () => api.listChats(sessionId),
    enabled: enabled && Boolean(sessionId),
    staleTime: 10_000,
  });
}

export function useGroupsQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.groups(sessionId),
    queryFn: () => api.listGroups(sessionId),
    enabled: enabled && Boolean(sessionId),
  });
}

export function useWebhooksQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.webhooks,
    queryFn: api.listWebhooks,
    enabled,
    select: (rows) => rows.map((w) => ({ ...w, events: Array.isArray(w.events) ? w.events : [] })),
  });
}

export function useTemplatesQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.templates(sessionId),
    queryFn: () => api.listTemplates(sessionId),
    enabled: enabled && Boolean(sessionId),
  });
}

export function useApiKeysQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.apiKeys, queryFn: api.listApiKeys, enabled });
}

export function useLogsQuery(params: { severity?: string; page: number; limit?: number }, enabled = true) {
  const limit = params.limit ?? 50;
  return useQuery({
    queryKey: queryKeys.logs({ severity: params.severity, page: params.page }),
    queryFn: () =>
      api.listAuditLogs({
        severity: params.severity,
        limit,
        offset: params.page * limit,
      }),
    enabled,
  });
}

export function useInfraQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.infra, queryFn: api.getInfraStatus, enabled, refetchInterval: 15_000 });
}

export function useInfraConfigQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.infraConfig, queryFn: api.getInfraConfig, enabled, staleTime: 30_000 });
}

export function useHealthQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.health, queryFn: api.getHealth, enabled, refetchInterval: 15_000 });
}

export function usePluginsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.plugins,
    queryFn: api.listPlugins,
    enabled,
    select: (rows) =>
      rows.map((p) => ({
        ...p,
        config: p.config ?? {},
        activeSessions: p.activeSessions ?? [],
        sessionConfig: p.sessionConfig ?? {},
      })),
  });
}

export function usePluginCatalogQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.pluginCatalog, queryFn: api.listPluginCatalog, enabled });
}

export function usePluginInstancesQuery(pluginId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pluginInstances(pluginId),
    queryFn: () => api.listPluginInstances(pluginId),
    enabled: enabled && Boolean(pluginId),
  });
}

export function usePluginConfigUiQuery(pluginId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pluginConfigUi(pluginId),
    queryFn: () => api.getPluginConfigUi(pluginId),
    enabled: enabled && Boolean(pluginId),
    staleTime: Infinity,
  });
}

export function useEnginesQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.engines, queryFn: api.listEngines, enabled, staleTime: 60_000 });
}

export function useCurrentEngineQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.currentEngine, queryFn: api.getCurrentEngine, enabled, staleTime: 60_000 });
}

export function useStatsOverviewQuery(enabled = true) {
  return useQuery({ queryKey: queryKeys.statsOverview, queryFn: api.getStatsOverview, enabled, staleTime: 30_000, retry: false });
}

export function useStatsMessagesQuery(period: api.StatsPeriod, enabled = true) {
  return useQuery({
    queryKey: queryKeys.statsMessages(period),
    queryFn: () => api.getMessageStats(period),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useBatchStatusQuery(sessionId: string, batchId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.batch(sessionId, batchId),
    queryFn: () => api.getBatchStatus(sessionId, batchId),
    enabled: enabled && Boolean(sessionId) && Boolean(batchId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "cancelled" || status === "failed") return false;
      return 2000;
    },
  });
}

export function useCreateWebhookMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createWebhook,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.webhooks }),
  });
}

export function useUpdateWebhookMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { sessionId: string } & Partial<api.OpenWAWebhook> }) =>
      api.updateWebhook(id, dto),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.webhooks }),
  });
}

export function useDeleteWebhookMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sessionId }: { id: string; sessionId: string }) => api.deleteWebhook(id, sessionId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.webhooks }),
  });
}

export function useCreateTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, dto }: { sessionId: string; dto: api.TemplatePayload }) =>
      api.createTemplate(sessionId, dto),
    onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: queryKeys.templates(vars.sessionId) }),
  });
}

export function useUpdateTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, id, dto }: { sessionId: string; id: string; dto: Partial<api.TemplatePayload> }) =>
      api.updateTemplate(sessionId, id, dto),
    onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: queryKeys.templates(vars.sessionId) }),
  });
}

export function useDeleteTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, id }: { sessionId: string; id: string }) => api.deleteTemplate(sessionId, id),
    onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: queryKeys.templates(vars.sessionId) }),
  });
}

export function useCreateApiKeyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createApiKey,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

export function useUpdateApiKeyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateApiKey>[1] }) => api.updateApiKey(id, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

export function useDeleteApiKeyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteApiKey,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

export function useRevokeApiKeyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.revokeApiKey,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

export function usePluginToggleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      enable ? api.enablePlugin(id) : api.disablePlugin(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins }),
  });
}

export function useInstallPluginUrlMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.installPluginFromUrl,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.plugins });
      void qc.invalidateQueries({ queryKey: queryKeys.pluginCatalog });
    },
  });
}

export function useInstallPluginFileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.installPlugin,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.plugins });
      void qc.invalidateQueries({ queryKey: queryKeys.pluginCatalog });
    },
  });
}

export function useUninstallPluginMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.uninstallPlugin,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins }),
  });
}

export function useUpdatePluginConfigMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: Record<string, unknown> }) => api.updatePluginConfig(id, config),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins }),
  });
}

export function useSetPluginSessionsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sessions }: { id: string; sessions: string[] }) => api.setPluginSessions(id, sessions),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins }),
  });
}

export function useUpdatePluginSessionConfigMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sessionId, config }: { id: string; sessionId: string; config: Record<string, unknown> }) =>
      api.updatePluginSessionConfig(id, sessionId, config),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins }),
  });
}

export function useCreateInstanceMutation(pluginId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: api.CreateInstanceInput) => api.createPluginInstance(pluginId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.pluginInstances(pluginId) }),
  });
}

export function useRegenerateInstanceSecretMutation(pluginId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => api.regenerateInstanceSecret(pluginId, instanceId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.pluginInstances(pluginId) }),
  });
}

export function useUpdateInstanceMutation(pluginId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { instanceId: string; body: api.UpdateInstanceInput }) =>
      api.updatePluginInstance(pluginId, params.instanceId, params.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.pluginInstances(pluginId) }),
  });
}

export function useDeleteInstanceMutation(pluginId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => api.deletePluginInstance(pluginId, instanceId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.pluginInstances(pluginId) }),
  });
}

export function useStartSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.connectSession,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  });
}

export function useStopSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.disconnectSession,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  });
}

export function useLogoutSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.logoutSession,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  });
}

export function useForceKillSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.forceKillSession,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  });
}

export function useDeleteSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSession,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  });
}

export function useCreateSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, proxyUrl }: { name: string; proxyUrl?: string }) => api.createSession(name, { proxyUrl }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  });
}

export function useUpdateSessionConfigMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateSessionConfig>[1] }) =>
      api.updateSessionConfig(id, patch),
    onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: queryKeys.sessionConfig(vars.id) }),
  });
}

export function useUpdateSessionProxyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proxyUrl }: { id: string; proxyUrl: string | null }) => api.updateSessionProxy(id, proxyUrl),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.sessionProxy(vars.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}
