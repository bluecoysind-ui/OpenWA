package com.rmyndharis.openwa.model;

import com.google.gson.annotations.SerializedName;

/** Calendar recurrence on a scheduled message. {@code NONE} is a one-shot. */
public enum RecurrenceKind {
    @SerializedName("none")
    NONE,
    @SerializedName("daily")
    DAILY,
    @SerializedName("weekly")
    WEEKLY,
    @SerializedName("monthly")
    MONTHLY
}
