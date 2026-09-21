package openwa

import "context"

// MediaService converts media into the formats WhatsApp plays.
// Backed by src/modules/media/media.controller.ts.
type MediaService struct{ client *Client }

func (s *MediaService) base(sessionID string) string {
	return "/api/sessions/" + pathEscape(sessionID) + "/media"
}

// ConvertMediaInput carries the media to convert. Set exactly one of URL or
// Base64; Base64 wins when both are given. No mimetype is needed — the input
// format is read from the bytes.
type ConvertMediaInput struct {
	URL      string `json:"url,omitempty"`
	Base64   string `json:"base64,omitempty"`
	PackName string `json:"packName,omitempty"`
	Author   string `json:"author,omitempty"`
	RemoveBg bool   `json:"removeBg,omitempty"`
}

// ConvertedMedia is the result, shaped for handing straight to a send call.
type ConvertedMedia struct {
	// Base64 holds the converted bytes, ready to use as a send call's Base64 field.
	Base64 string `json:"base64"`
	// Mimetype is what the bytes now are, not what they were.
	Mimetype string `json:"mimetype"`
	// Bytes is the decoded size, so a size check needs no decoding.
	Bytes int64 `json:"bytes"`
}

// MediaConversionAvailability reports whether conversion can be used here.
type MediaConversionAvailability struct {
	Available bool `json:"available"`
}

// ConversionStatus reports whether conversion is switched on for this deployment
// AND the ffmpeg binary can be run. Worth checking once: against a server without
// it, a caller must convert on its own side rather than take an error per request.
func (s *MediaService) ConversionStatus(ctx context.Context, sessionID string) (*MediaConversionAvailability, error) {
	var out MediaConversionAvailability
	err := s.client.do(ctx, "GET", s.base(sessionID)+"/convert", nil, nil, &out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// ConvertVoice converts audio into a WhatsApp voice note (Ogg/Opus, mono, tuned
// for speech). WhatsApp shows a playable mic bubble only for this format — MP3
// bytes sent with PTT produce a voice note that will not play. Pass the returned
// Base64 to SendAudio with PTT set. Requires an OPERATOR-level key.
func (s *MediaService) ConvertVoice(ctx context.Context, sessionID string, in ConvertMediaInput) (*ConvertedMedia, error) {
	var out ConvertedMedia
	err := s.client.do(ctx, "POST", s.base(sessionID)+"/convert/voice", nil, in, &out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// ConvertVideo converts video into an MP4 every WhatsApp client accepts: baseline
// H.264 with AAC audio, long edge bounded at 1280, index moved to the front for
// immediate playback. Requires an OPERATOR-level key.
func (s *MediaService) ConvertVideo(ctx context.Context, sessionID string, in ConvertMediaInput) (*ConvertedMedia, error) {
	var out ConvertedMedia
	err := s.client.do(ctx, "POST", s.base(sessionID)+"/convert/video", nil, in, &out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// ConvertSticker converts image or video into a 512×512 WebP sticker (duration-capped).
// Optional PackName/Author EXIF and RemoveBg. Requires an OPERATOR-level key.
func (s *MediaService) ConvertSticker(ctx context.Context, sessionID string, in ConvertMediaInput) (*ConvertedMedia, error) {
	var out ConvertedMedia
	err := s.client.do(ctx, "POST", s.base(sessionID)+"/convert/sticker", nil, in, &out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// StoredMediaFile is one inbound file stored when MEDIA_PERSIST is on.
type StoredMediaFile struct {
	MessageID string `json:"messageId"`
	CreatedAt string `json:"createdAt"`
	URL       string `json:"url"`
}

// ListFiles lists inbound files stored when MEDIA_PERSIST is on. 404 when the flag is off.
func (s *MediaService) ListFiles(ctx context.Context, sessionID string) ([]StoredMediaFile, error) {
	var out []StoredMediaFile
	err := s.client.do(ctx, "GET", s.base(sessionID)+"/files", nil, nil, &out)
	return out, err
}

// GetFile fetches stored inbound media bytes. 404 when MEDIA_PERSIST is off or the file is missing.
func (s *MediaService) GetFile(ctx context.Context, sessionID, messageID string) (*StatusMedia, error) {
	data, contentType, err := s.client.doRaw(ctx, "GET", s.base(sessionID)+"/files/"+pathEscape(messageID), nil, nil)
	if err != nil {
		return nil, err
	}
	return &StatusMedia{Data: data, ContentType: contentType}, nil
}

// DeleteFile removes a stored inbound media file.
func (s *MediaService) DeleteFile(ctx context.Context, sessionID, messageID string) error {
	return s.client.do(ctx, "DELETE", s.base(sessionID)+"/files/"+pathEscape(messageID), nil, nil, nil)
}
