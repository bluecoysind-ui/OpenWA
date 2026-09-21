package com.rmyndharis.openwa.model;

/** Boolean feature flags from GET /api/features. No secrets. */
public record FeatureFlagsResponse(
        boolean scheduler,
        boolean botCommands,
        boolean mediaPersist,
        boolean removeBgConfigured,
        boolean regexRules,
        boolean pollVoteEvents) {}
