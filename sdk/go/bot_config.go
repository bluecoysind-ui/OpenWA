package openwa

import "context"

// BotConfigService is per-session bot config (access lists, prefix, commands, welcome).
// Backed by src/modules/bot/bot-config.controller.ts.
type BotConfigService struct{ client *Client }

func (s *BotConfigService) path(sessionID string) string {
	return "/api/sessions/" + pathEscape(sessionID) + "/bot-config"
}

func (s *BotConfigService) Get(ctx context.Context, sessionID string) (map[string]any, error) {
	var out map[string]any
	err := s.client.do(ctx, "GET", s.path(sessionID), nil, nil, &out)
	return out, err
}

func (s *BotConfigService) Update(ctx context.Context, sessionID string, body map[string]any) (map[string]any, error) {
	var out map[string]any
	err := s.client.do(ctx, "PUT", s.path(sessionID), nil, body, &out)
	if err != nil {
		return nil, err
	}
	return out, nil
}
