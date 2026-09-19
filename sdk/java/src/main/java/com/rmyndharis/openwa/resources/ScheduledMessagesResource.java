package com.rmyndharis.openwa.resources;

import static com.rmyndharis.openwa.http.Http.encodeSegment;

import com.rmyndharis.openwa.OpenWAClient;
import com.rmyndharis.openwa.http.HttpMethod;
import java.util.List;
import java.util.Map;

/** Scheduled messages — one-shot delayed sends. */
public final class ScheduledMessagesResource {
    private final OpenWAClient client;

    public ScheduledMessagesResource(OpenWAClient client) {
        this.client = client;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> list(String sessionId) {
        return (List<Map<String, Object>>) (List<?>) client.requestList(
            HttpMethod.GET,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages",
            null,
            null,
            Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> create(String sessionId, Map<String, Object> body) {
        return client.request(
            HttpMethod.POST,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages",
            null,
            body,
            Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String sessionId, String jobId) {
        return client.request(
            HttpMethod.GET,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages/" + encodeSegment(jobId),
            null,
            null,
            Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> update(String sessionId, String jobId, Map<String, Object> body) {
        return client.request(
            HttpMethod.PATCH,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages/" + encodeSegment(jobId),
            null,
            body,
            Map.class);
    }

    public void delete(String sessionId, String jobId) {
        client.requestVoid(
            HttpMethod.DELETE,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages/" + encodeSegment(jobId),
            null,
            null);
    }
}
