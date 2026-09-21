<?php

declare(strict_types=1);

namespace OpenWA\Resources;

use OpenWA\Http\HttpExecutor;

/**
 * Scheduled messages — one-shot and recurring delayed sends.
 *
 * Backed by src/modules/scheduler/scheduler.controller.ts.
 *
 * Recurrence is daily/weekly/monthly on the same row (IANA timezone, DST-correct). Recurring
 * jobs require `until` and/or `maxOccurrences`. There is no cronExpression.
 *
 * @phpstan-type RecurrenceKind 'none'|'daily'|'weekly'|'monthly'
 * @phpstan-type ScheduledMediaType 'text'|'image'|'video'|'document'|'audio'
 * @phpstan-type ScheduledMessageStatus 'pending'|'sending'|'sent'|'failed'|'cancelled'|'paused'
 * @phpstan-type CreateScheduledMessageRequest array{
 *     chatId: string,
 *     sendAt: string,
 *     timezone?: string,
 *     text?: string,
 *     mediaUrl?: string,
 *     mediaType?: ScheduledMediaType,
 *     caption?: string,
 *     recurrence?: RecurrenceKind,
 *     interval?: int,
 *     daysOfWeek?: list<int>,
 *     dayOfMonth?: int,
 *     until?: string,
 *     maxOccurrences?: int
 * }
 * @phpstan-type UpdateScheduledMessageRequest array{
 *     sendAt?: string,
 *     timezone?: string,
 *     text?: string,
 *     mediaUrl?: ?string,
 *     mediaType?: ScheduledMediaType,
 *     caption?: ?string,
 *     recurrence?: RecurrenceKind,
 *     interval?: int,
 *     daysOfWeek?: ?list<int>,
 *     dayOfMonth?: ?int,
 *     until?: ?string,
 *     maxOccurrences?: ?int,
 *     status?: 'pending'|'paused'
 * }
 * @phpstan-type ScheduledMessageRecord array{
 *     id: string,
 *     sessionId: string,
 *     chatId: string,
 *     sendAt: string,
 *     timezone: string,
 *     text: ?string,
 *     mediaUrl: ?string,
 *     mediaType: ScheduledMediaType,
 *     caption: ?string,
 *     status: ScheduledMessageStatus,
 *     recurrence: RecurrenceKind,
 *     interval: int,
 *     daysOfWeek: ?list<int>,
 *     dayOfMonth: ?int,
 *     until: ?string,
 *     maxOccurrences: ?int,
 *     occurrenceCount: int,
 *     attemptCount: int,
 *     lastError: ?string,
 *     sentMessageId: ?string,
 *     createdAt: string,
 *     updatedAt: string
 * }
 */
class ScheduledMessagesResource
{
    private HttpExecutor $http;

    public function __construct(HttpExecutor $http)
    {
        $this->http = $http;
    }

    /** @return list<ScheduledMessageRecord> */
    public function list(string $sessionId): array
    {
        return $this->http->request('GET', "/api/sessions/{$this->http->encodeSegment($sessionId)}/scheduled-messages") ?? [];
    }

    /**
     * @param CreateScheduledMessageRequest $body
     * @return ScheduledMessageRecord
     */
    public function create(string $sessionId, array $body): array
    {
        return $this->http->request('POST', "/api/sessions/{$this->http->encodeSegment($sessionId)}/scheduled-messages", [], $body);
    }

    /** @return ScheduledMessageRecord */
    public function get(string $sessionId, string $jobId): array
    {
        return $this->http->request(
            'GET',
            "/api/sessions/{$this->http->encodeSegment($sessionId)}/scheduled-messages/{$this->http->encodeSegment($jobId)}"
        );
    }

    /**
     * @param UpdateScheduledMessageRequest $body
     * @return ScheduledMessageRecord
     */
    public function update(string $sessionId, string $jobId, array $body): array
    {
        return $this->http->request(
            'PATCH',
            "/api/sessions/{$this->http->encodeSegment($sessionId)}/scheduled-messages/{$this->http->encodeSegment($jobId)}",
            [],
            $body
        );
    }

    public function delete(string $sessionId, string $jobId): void
    {
        $this->http->request(
            'DELETE',
            "/api/sessions/{$this->http->encodeSegment($sessionId)}/scheduled-messages/{$this->http->encodeSegment($jobId)}"
        );
    }
}
