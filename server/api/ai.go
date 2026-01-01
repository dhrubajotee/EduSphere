// server/api/ai.go

package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// aiMessage is the internal representation we use for chat messages.
type aiMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// openAIChatRequest models the payload sent to OpenAI's chat completions endpoint.
type openAIChatRequest struct {
	Model          string            `json:"model"`
	Messages       []aiMessage       `json:"messages"`
	Stream         bool              `json:"stream"`
	ResponseFormat map[string]string `json:"response_format,omitempty"`
}

// openAIChatResponse models the non-streaming response structure from OpenAI.
type openAIChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

// ------------------------------------------------------------------
// callOpenAIChat: shared helper that hits OpenAI /v1/chat/completions
// ------------------------------------------------------------------
func callOpenAIChat(ctx context.Context, apiKey, model string, messages []aiMessage, expectJSON bool) (string, error) {
	if apiKey == "" {
		return "", fmt.Errorf("missing OpenAI API key")
	}
	if model == "" {
		model = "gpt-4o-mini"
	}

	reqBody := openAIChatRequest{
		Model:    model,
		Messages: messages,
		Stream:   false,
	}
	if expectJSON {
		reqBody.ResponseFormat = map[string]string{"type": "json_object"}
	}

	b, _ := json.Marshal(reqBody)

	httpClient := &http.Client{
		Timeout: 480 * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(b))
	if err != nil {
		return "", fmt.Errorf("failed to create OpenAI request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	log.Printf("[AI] Sending request to OpenAI: model=%s, len(messages)=%d", model, len(messages))

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to reach OpenAI: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
		return "", fmt.Errorf("openai returned %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var out openAIChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
		log.Printf("[AI ERROR] failed to decode OpenAI response: %v\nResponse body (truncated): %s", err, string(body))
		return "", fmt.Errorf("invalid OpenAI response: %w", err)
	}

	if out.Error != nil && out.Error.Message != "" {
		return "", fmt.Errorf("openai error: %s (%s)", out.Error.Message, out.Error.Type)
	}
	if len(out.Choices) == 0 {
		return "", fmt.Errorf("openai response had no choices")
	}

	content := out.Choices[0].Message.Content
	log.Printf("[AI] OpenAI response (first 200 chars): %s", truncate(content, 200))
	return content, nil
}

// Helper: safe truncation for log output
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "...(truncated)"
}
