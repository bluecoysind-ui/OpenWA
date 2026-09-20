package openwa

// ── Health ──────────────────────────────────────────────

// HealthResponse is the /health payload.
type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp,omitempty"`
	Version   string `json:"version,omitempty"`
}

// DependencyStatus is one dependency's health snapshot inside a readiness
// payload (e.g. {"mainDatabase":{"status":"up"}}).
type DependencyStatus struct {
	Status string `json:"status"`
}

// HealthReadyResponse is the /health/ready payload. Details maps a dependency
// name (e.g. "mainDatabase", "dataDatabase") to its DependencyStatus.
type HealthReadyResponse struct {
	Status  string                      `json:"status"`
	Details map[string]DependencyStatus `json:"details,omitempty"`
}

// FeatureFlagsResponse is GET /api/features — booleans only, no secrets.
type FeatureFlagsResponse struct {
	Scheduler          bool `json:"scheduler"`
	BotCommands        bool `json:"botCommands"`
	MediaPersist       bool `json:"mediaPersist"`
	RemoveBgConfigured bool `json:"removeBgConfigured"`
	RegexRules         bool `json:"regexRules"`
	PollVoteEvents     bool `json:"pollVoteEvents"`
}

// ── Auth ─────────────────────────────────────────────────

// AuthValidateResponse reports whether the API key is valid and its role.
type AuthValidateResponse struct {
	Valid bool   `json:"valid"`
	Role  string `json:"role,omitempty"`
}

// ── Template ───────────────────────────────────────────

// TemplateRecord is a stored message template with {{variable}} placeholders.
type TemplateRecord struct {
	ID        string  `json:"id"`
	SessionID string  `json:"sessionId"`
	Name      string  `json:"name"`
	Body      string  `json:"body"`
	Header    *string `json:"header,omitempty"`
	Footer    *string `json:"footer,omitempty"`
	CreatedAt string  `json:"createdAt"`
	UpdatedAt string  `json:"updatedAt"`
}

// CreateTemplateRequest creates a template. Name and Body required.
type CreateTemplateRequest struct {
	Name   string `json:"name"`
	Body   string `json:"body"`
	Header string `json:"header,omitempty"`
	Footer string `json:"footer,omitempty"`
}

// UpdateTemplateRequest updates a template; all fields optional.
//
// Header and Footer are pointers because an empty string is how the server is told to REMOVE them.
// As value types with `omitempty` they marshalled away, so a Go caller could never clear a header
// once set — every rendered message kept prepending the old text while the update reported success.
type UpdateTemplateRequest struct {
	Name   string  `json:"name,omitempty"`
	Body   string  `json:"body,omitempty"`
	Header *string `json:"header,omitempty"`
	Footer *string `json:"footer,omitempty"`
}

// ── Label (WhatsApp Business) ────────────────────────────────

// LabelRecord is a WhatsApp Business chat label.
type LabelRecord struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	HexColor string `json:"hexColor,omitempty"`
}

// AddLabelRequest applies a label to a chat.
type AddLabelRequest struct {
	LabelID string `json:"labelId"`
}

// ── Scheduled messages ───────────────────────────────────────────

// RecurrenceKind is none (one-shot) or a calendar repeat on the same row.
type RecurrenceKind string

const (
	RecurrenceNone    RecurrenceKind = "none"
	RecurrenceDaily   RecurrenceKind = "daily"
	RecurrenceWeekly  RecurrenceKind = "weekly"
	RecurrenceMonthly RecurrenceKind = "monthly"
)

// ScheduledMessageStatus is the job lifecycle, including pause.
type ScheduledMessageStatus string

const (
	ScheduledPending   ScheduledMessageStatus = "pending"
	ScheduledSending   ScheduledMessageStatus = "sending"
	ScheduledSent      ScheduledMessageStatus = "sent"
	ScheduledFailed    ScheduledMessageStatus = "failed"
	ScheduledCancelled ScheduledMessageStatus = "cancelled"
	ScheduledPaused    ScheduledMessageStatus = "paused"
)

// CreateScheduledMessageRequest creates a one-shot or recurring delayed send.
// Recurring jobs require Until and/or MaxOccurrences.
type CreateScheduledMessageRequest struct {
	ChatID         string         `json:"chatId"`
	SendAt         string         `json:"sendAt"`
	Timezone       string         `json:"timezone,omitempty"`
	Text           string         `json:"text,omitempty"`
	MediaURL       string         `json:"mediaUrl,omitempty"`
	MediaType      string         `json:"mediaType,omitempty"`
	Caption        string         `json:"caption,omitempty"`
	Recurrence     RecurrenceKind `json:"recurrence,omitempty"`
	Interval       int            `json:"interval,omitempty"`
	DaysOfWeek     []int          `json:"daysOfWeek,omitempty"`
	DayOfMonth     *int           `json:"dayOfMonth,omitempty"`
	Until          string         `json:"until,omitempty"`
	MaxOccurrences *int           `json:"maxOccurrences,omitempty"`
}

// UpdateScheduledMessageRequest patches a pending or paused job. Status is only pending↔paused.
type UpdateScheduledMessageRequest struct {
	SendAt         string                 `json:"sendAt,omitempty"`
	Timezone       string                 `json:"timezone,omitempty"`
	Text           string                 `json:"text,omitempty"`
	MediaURL       *string                `json:"mediaUrl,omitempty"`
	MediaType      string                 `json:"mediaType,omitempty"`
	Caption        *string                `json:"caption,omitempty"`
	Recurrence     RecurrenceKind         `json:"recurrence,omitempty"`
	Interval       int                    `json:"interval,omitempty"`
	DaysOfWeek     []int                  `json:"daysOfWeek,omitempty"`
	DayOfMonth     *int                   `json:"dayOfMonth,omitempty"`
	Until          *string                `json:"until,omitempty"`
	MaxOccurrences *int                   `json:"maxOccurrences,omitempty"`
	Status         ScheduledMessageStatus `json:"status,omitempty"`
}

// ScheduledMessageRecord is a stored scheduled send, one-shot or recurring.
type ScheduledMessageRecord struct {
	ID              string                 `json:"id"`
	SessionID       string                 `json:"sessionId"`
	ChatID          string                 `json:"chatId"`
	SendAt          string                 `json:"sendAt"`
	Timezone        string                 `json:"timezone"`
	Text            *string                `json:"text"`
	MediaURL        *string                `json:"mediaUrl"`
	MediaType       string                 `json:"mediaType"`
	Caption         *string                `json:"caption"`
	Status          ScheduledMessageStatus `json:"status"`
	Recurrence      RecurrenceKind         `json:"recurrence"`
	Interval        int                    `json:"interval"`
	DaysOfWeek      []int                  `json:"daysOfWeek"`
	DayOfMonth      *int                   `json:"dayOfMonth"`
	Until           *string                `json:"until"`
	MaxOccurrences  *int                   `json:"maxOccurrences"`
	OccurrenceCount int                    `json:"occurrenceCount"`
	AttemptCount    int                    `json:"attemptCount"`
	LastError       *string                `json:"lastError"`
	SentMessageID   *string                `json:"sentMessageId"`
	CreatedAt       string                 `json:"createdAt"`
	UpdatedAt       string                 `json:"updatedAt"`
}
