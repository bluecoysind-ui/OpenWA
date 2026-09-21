<?php

declare(strict_types=1);

namespace OpenWA\Resources;

use OpenWA\Http\HttpExecutor;

/**
 * Per-session bot config — access lists, prefix, commands, autoRead, welcome.
 *
 * Backed by src/modules/bot/bot-config.controller.ts.
 */
class BotConfigResource
{
    private HttpExecutor $http;

    public function __construct(HttpExecutor $http)
    {
        $this->http = $http;
    }

    /** @return array<string,mixed> */
    public function get(string $sessionId): array
    {
        return $this->http->request('GET', "/api/sessions/{$this->http->encodeSegment($sessionId)}/bot-config");
    }

    /**
     * @param array<string,mixed> $body
     * @return array<string,mixed>
     */
    public function update(string $sessionId, array $body): array
    {
        return $this->http->request(
            'PUT',
            "/api/sessions/{$this->http->encodeSegment($sessionId)}/bot-config",
            [],
            $body
        );
    }
}
