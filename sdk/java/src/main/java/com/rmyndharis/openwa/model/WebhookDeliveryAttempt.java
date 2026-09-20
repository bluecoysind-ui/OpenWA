package com.rmyndharis.openwa.model;

/** One HTTP attempt against a webhook. Never includes request/response bodies. */
public final class WebhookDeliveryAttempt {
    public String id;
    public String status;
    public Integer httpCode;
    public int durationMs;
    public int attempt;
    public String errorSnippet;
    public String createdAt;
}
