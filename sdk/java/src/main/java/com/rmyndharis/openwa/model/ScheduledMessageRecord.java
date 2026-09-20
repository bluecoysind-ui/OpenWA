package com.rmyndharis.openwa.model;

import java.util.List;

/** A stored scheduled send, one-shot or recurring. Optional fields are {@code null} when absent. */
public record ScheduledMessageRecord(
    String id,
    String sessionId,
    String chatId,
    String sendAt,
    String timezone,
    String text,
    String mediaUrl,
    String mediaType,
    String caption,
    ScheduledMessageStatus status,
    RecurrenceKind recurrence,
    int interval,
    List<Integer> daysOfWeek,
    Integer dayOfMonth,
    String until,
    Integer maxOccurrences,
    int occurrenceCount,
    int attemptCount,
    String lastError,
    String sentMessageId,
    String createdAt,
    String updatedAt) {}
