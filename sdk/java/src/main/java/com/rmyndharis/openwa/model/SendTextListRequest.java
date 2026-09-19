package com.rmyndharis.openwa.model;

import java.util.List;

/** Request body for send-text-list (formatted text, not a native WhatsApp list). */
public record SendTextListRequest(
    String chatId, String title, List<String> options, String footer, String quotedMessageId, List<String> mentions) {
    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String chatId;
        private String title;
        private List<String> options;
        private String footer;
        private String quotedMessageId;
        private List<String> mentions;

        public Builder chatId(String v) {
            this.chatId = v;
            return this;
        }

        public Builder title(String v) {
            this.title = v;
            return this;
        }

        public Builder options(List<String> v) {
            this.options = v;
            return this;
        }

        public Builder footer(String v) {
            this.footer = v;
            return this;
        }

        public Builder quotedMessageId(String v) {
            this.quotedMessageId = v;
            return this;
        }

        public Builder mentions(List<String> v) {
            this.mentions = v;
            return this;
        }

        public SendTextListRequest build() {
            return new SendTextListRequest(chatId, title, options, footer, quotedMessageId, mentions);
        }
    }
}
