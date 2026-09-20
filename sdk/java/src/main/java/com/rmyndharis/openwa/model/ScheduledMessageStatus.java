package com.rmyndharis.openwa.model;

import com.google.gson.annotations.SerializedName;

/** Lifecycle of a scheduled send, including pause. */
public enum ScheduledMessageStatus {
    @SerializedName("pending")
    PENDING,
    @SerializedName("sending")
    SENDING,
    @SerializedName("sent")
    SENT,
    @SerializedName("failed")
    FAILED,
    @SerializedName("cancelled")
    CANCELLED,
    @SerializedName("paused")
    PAUSED
}
