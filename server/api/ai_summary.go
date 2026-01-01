// server/api/ai_summary.go

package api

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nibir1/go-fiber-postgres-REST-boilerplate/token"
)

// POST /api/summaries/generate
func (s *Server) generateSummary(c *fiber.Ctx) error {
	payload, ok := c.Locals(authorizationPayloadKey).(*token.Payload)
	if !ok || payload == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(errorResponse(fmt.Errorf("unauthorized")))
	}

	// Fetch latest transcript
	transcripts, err := s.store.ListTranscripts(c.Context(), payload.Username)
	if err != nil || len(transcripts) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(errorResponse(fmt.Errorf("no transcripts found")))
	}
	fullTr, err := s.store.GetTranscript(c.Context(), transcripts[0].ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(err))
	}

	txText := strings.TrimSpace(fullTr.TextExtracted.String)
	if txText == "" {
		return c.Status(fiber.StatusBadRequest).JSON(errorResponse(fmt.Errorf("transcript has no extracted text")))
	}

	// Build messages
	prompt := fmt.Sprintf(`
Summarize the student's transcript below into 3 concise paragraphs.
Focus on academic strengths, software engineering skills, and AI or data science potential.

Transcript:
"""%s"""
`, txText)

	messages := []aiMessage{
		{Role: "system", Content: "You are an academic summarizer. Return only plain text summary, no markdown."},
		{Role: "user", Content: prompt},
	}

	resp, err := callOpenAIChat(c.Context(), s.config.OpenAIAPIKey, s.config.OpenAIModel, messages, false)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(fmt.Errorf("openai failed: %v", err)))
	}

	summaryText := strings.TrimSpace(resp)

	return c.JSON(fiber.Map{
		"user":         payload.Username,
		"summary_text": summaryText,
		"generated_at": time.Now(),
	})
}
