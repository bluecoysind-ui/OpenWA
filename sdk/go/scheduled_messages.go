package openwa

import "context"

// ScheduledMessagesService is one-shot and recurring delayed sends.
// Backed by src/modules/scheduler/scheduler.controller.ts.
type ScheduledMessagesService struct{ client *Client }

func (s *ScheduledMessagesService) base(sessionID string) string {
	return "/api/sessions/" + pathEscape(sessionID) + "/scheduled-messages"
}

func (s *ScheduledMessagesService) List(ctx context.Context, sessionID string) ([]map[string]any, error) {
	var out []map[string]any
	err := s.client.do(ctx, "GET", s.base(sessionID), nil, nil, &out)
	return out, err
}

func (s *ScheduledMessagesService) Create(ctx context.Context, sessionID string, body map[string]any) (map[string]any, error) {
	var out map[string]any
	err := s.client.do(ctx, "POST", s.base(sessionID), nil, body, &out)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (s *ScheduledMessagesService) Get(ctx context.Context, sessionID, jobID string) (map[string]any, error) {
	var out map[string]any
	err := s.client.do(ctx, "GET", s.base(sessionID)+"/"+pathEscape(jobID), nil, nil, &out)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (s *ScheduledMessagesService) Update(ctx context.Context, sessionID, jobID string, body map[string]any) (map[string]any, error) {
	var out map[string]any
	err := s.client.do(ctx, "PATCH", s.base(sessionID)+"/"+pathEscape(jobID), nil, body, &out)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (s *ScheduledMessagesService) Delete(ctx context.Context, sessionID, jobID string) error {
	return s.client.do(ctx, "DELETE", s.base(sessionID)+"/"+pathEscape(jobID), nil, nil, nil)
}
