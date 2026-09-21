package com.rmyndharis.openwa.resources;

import static com.rmyndharis.openwa.http.Http.encodeSegment;

import com.rmyndharis.openwa.OpenWAClient;
import com.rmyndharis.openwa.http.HttpMethod;
import com.rmyndharis.openwa.model.CreateScheduledMessageRequest;
import com.rmyndharis.openwa.model.ScheduledMessageRecord;
import com.rmyndharis.openwa.model.UpdateScheduledMessageRequest;
import java.util.List;

/** Scheduled messages — one-shot and recurring delayed sends. */
public final class ScheduledMessagesResource {
    private final OpenWAClient client;

    public ScheduledMessagesResource(OpenWAClient client) {
        this.client = client;
    }

    public List<ScheduledMessageRecord> list(String sessionId) {
        return client.requestList(
            HttpMethod.GET,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages",
            null,
            null,
            ScheduledMessageRecord.class);
    }

    public ScheduledMessageRecord create(String sessionId, CreateScheduledMessageRequest body) {
        return client.request(
            HttpMethod.POST,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages",
            null,
            body,
            ScheduledMessageRecord.class);
    }

    public ScheduledMessageRecord get(String sessionId, String jobId) {
        return client.request(
            HttpMethod.GET,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages/" + encodeSegment(jobId),
            null,
            null,
            ScheduledMessageRecord.class);
    }

    public ScheduledMessageRecord update(String sessionId, String jobId, UpdateScheduledMessageRequest body) {
        return client.request(
            HttpMethod.PATCH,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages/" + encodeSegment(jobId),
            null,
            body,
            ScheduledMessageRecord.class);
    }

    public void delete(String sessionId, String jobId) {
        client.requestVoid(
            HttpMethod.DELETE,
            "/api/sessions/" + encodeSegment(sessionId) + "/scheduled-messages/" + encodeSegment(jobId),
            null,
            null);
    }
}
