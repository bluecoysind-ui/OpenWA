package com.rmyndharis.openwa.resources;

import static com.rmyndharis.openwa.http.Http.encodeSegment;

import com.rmyndharis.openwa.OpenWAClient;
import com.rmyndharis.openwa.http.HttpMethod;
import java.util.Map;

/** Per-session bot config — access lists, prefix, commands, autoRead, welcome. */
public final class BotConfigResource {
    private final OpenWAClient client;

    public BotConfigResource(OpenWAClient client) {
        this.client = client;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String sessionId) {
        return client.request(
            HttpMethod.GET,
            "/api/sessions/" + encodeSegment(sessionId) + "/bot-config",
            null,
            null,
            Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> update(String sessionId, Map<String, Object> body) {
        return client.request(
            HttpMethod.PUT,
            "/api/sessions/" + encodeSegment(sessionId) + "/bot-config",
            null,
            body,
            Map.class);
    }
}
