<?php

declare(strict_types=1);

namespace OpenWA\Resources;

use OpenWA\Http\HttpExecutor;

/**
 * Scheduled messages — one-shot delayed sends.
 *
 * Backed by src/modules/scheduler/scheduler.controller.ts.
 */
class ScheduledMessagesResource
{
    private HttpExecutor $http;

    public function __construct(HttpExecutor $http)
    {
        $this->http = $http;
    }

    /** @return list<array<string,mixed>> */
    public function list(string $sessionId): array
    {
        return $this->http->request('GET', "/api/sessions/{$this->http->encodeSegment($sessionId)}/scheduled-messages") ?? [];
    }

    /**
     * @param array<string,mixed> $body
     * @return array<string,mixed>
     */
    public function create(string $sessionId, array $body): array
    {
        return $this->http->request('POST', "/api/sessions/{$this->http->encodeSegment($sessionId)}/scheduled-messages", [], $body);
    }

    /** @return array<string,mixed> */
    public function get(string $sessionId, string $jobId): array
    {
        return $this->http->request(
            'GET',
            "/api/sessions/{$this->http->encodeSegment($sessionId)}/scheduled-messages/{$this->http->encodeSegment($jobId)}"
        );
    }

    /**
     * @param array<string,mixed> $body
     * @return array<string,mixed>
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
