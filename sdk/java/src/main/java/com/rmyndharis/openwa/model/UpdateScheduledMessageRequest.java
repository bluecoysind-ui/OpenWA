package com.rmyndharis.openwa.model;

import java.util.List;

/**
 * Partial update of a pending or paused scheduled send. {@code status} is only pending↔paused.
 * Optional fields are omitted when {@code null}.
 */
public record UpdateScheduledMessageRequest(
    String sendAt,
    String timezone,
    String text,
    String mediaUrl,
    String mediaType,
    String caption,
    RecurrenceKind recurrence,
    Integer interval,
    List<Integer> daysOfWeek,
    Integer dayOfMonth,
    String until,
    Integer maxOccurrences,
    ScheduledMessageStatus status) {

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String sendAt;
        private String timezone;
        private String text;
        private String mediaUrl;
        private String mediaType;
        private String caption;
        private RecurrenceKind recurrence;
        private Integer interval;
        private List<Integer> daysOfWeek;
        private Integer dayOfMonth;
        private String until;
        private Integer maxOccurrences;
        private ScheduledMessageStatus status;

        public Builder sendAt(String v) {
            this.sendAt = v;
            return this;
        }

        public Builder timezone(String v) {
            this.timezone = v;
            return this;
        }

        public Builder text(String v) {
            this.text = v;
            return this;
        }

        public Builder mediaUrl(String v) {
            this.mediaUrl = v;
            return this;
        }

        public Builder mediaType(String v) {
            this.mediaType = v;
            return this;
        }

        public Builder caption(String v) {
            this.caption = v;
            return this;
        }

        public Builder recurrence(RecurrenceKind v) {
            this.recurrence = v;
            return this;
        }

        public Builder interval(Integer v) {
            this.interval = v;
            return this;
        }

        public Builder daysOfWeek(List<Integer> v) {
            this.daysOfWeek = v;
            return this;
        }

        public Builder dayOfMonth(Integer v) {
            this.dayOfMonth = v;
            return this;
        }

        public Builder until(String v) {
            this.until = v;
            return this;
        }

        public Builder maxOccurrences(Integer v) {
            this.maxOccurrences = v;
            return this;
        }

        public Builder status(ScheduledMessageStatus v) {
            this.status = v;
            return this;
        }

        public UpdateScheduledMessageRequest build() {
            return new UpdateScheduledMessageRequest(
                sendAt,
                timezone,
                text,
                mediaUrl,
                mediaType,
                caption,
                recurrence,
                interval,
                daysOfWeek,
                dayOfMonth,
                until,
                maxOccurrences,
                status);
        }
    }
}
