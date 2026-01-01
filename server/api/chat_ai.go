// server/api/chat_ai.go

package api

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	db "github.com/nibir1/go-fiber-postgres-REST-boilerplate/db/sqlc" // Added for DB Params
	"github.com/nibir1/go-fiber-postgres-REST-boilerplate/token"
)

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// POST /api/chat/stream
func (s *Server) chatStream(c *fiber.Ctx) error {
	// --- Auth check ---
	payload, ok := c.Locals(authorizationPayloadKey).(*token.Payload)
	if !ok || payload == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(errorResponse(fmt.Errorf("unauthorized")))
	}

	// --- Parse request body ---
	var req struct {
		Messages []ChatMessage `json:"messages"`
	}
	if err := c.BodyParser(&req); err != nil || len(req.Messages) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(errorResponse(fmt.Errorf("invalid request body")))
	}

	// --- Build System Context (VITAL PHASE 3 UPDATE) ---

	// 1. Base System Prompt
	systemContext := "You are EduSphere AI, an academic advisor who provides personalized advice based on the provided user's full academic context (transcript, recommended courses, and potential scholarships). Be concise and professional. You must use the provided context to justify your answers."

	// 2. Read the Recommendation context header
	recoIDStr := c.Get("X-Recommendation-ID")

	if recoIDStr != "" {
		recoID, err := strconv.ParseInt(recoIDStr, 10, 64)

		if err == nil {
			// Fetch the full Recommendation record
			reco, err := s.store.GetRecommendation(c.Context(), recoID)

			if err == nil {
				var contextBuilder strings.Builder

				// 3a. Inject Transcript Text
				if reco.TranscriptID.Valid {
					tr, trErr := s.store.GetTranscript(c.Context(), reco.TranscriptID.Int64)
					if trErr == nil && tr.TextExtracted.Valid && strings.TrimSpace(tr.TextExtracted.String) != "" {
						contextBuilder.WriteString(fmt.Sprintf("\n\n[USER ACADEMIC TRANSCRIPT TEXT]\n%s\n", tr.TextExtracted.String))
					}
				}

				// --- DEBUG STEP: Log the raw payload to find the correct key ---
				if len(reco.Payload) > 2 {
					log.Printf("[AI-CHAT] DEBUG RAW PAYLOAD: %s", string(reco.Payload))
				}
				// ------------------------------------------------------------------

				// 3b. Inject Recommendation Payload (Courses, Rationale)
				if len(reco.Payload) > 2 {
					var payloadMap map[string]json.RawMessage
					if json.Unmarshal(reco.Payload, &payloadMap) == nil {

						// i. Inject Recommended Courses
						if coursesJSON, ok := payloadMap["courses"]; ok && len(coursesJSON) > 2 {
							contextBuilder.WriteString(fmt.Sprintf("\n\n[RECOMMENDED COURSES JSON]\n%s\n", string(coursesJSON)))
						}

						// ii. We remove "scholarships" key from here if it exists in the JSON blob,
						// because we will fetch the FRESH list from the DB below.
						delete(payloadMap, "courses")
						delete(payloadMap, "scholarships") // Ignore blob scholarships, use DB instead

						// iii. Inject remaining payload
						if remainingJSON, err := json.Marshal(payloadMap); err == nil && len(remainingJSON) > 2 {
							contextBuilder.WriteString(fmt.Sprintf("\n\n[OTHER RECOMMENDATION DATA JSON]\n%s\n", string(remainingJSON)))
						}

					} else {
						// Fallback: If parsing fails, inject the entire payload raw
						contextBuilder.WriteString(fmt.Sprintf("\n\n[RAW RECOMMENDATION PAYLOAD JSON]\n%s\n", string(reco.Payload)))
					}
				}

				// Append the combined context to the system prompt
				if contextBuilder.Len() > 0 {
					systemContext += "\n\n[FULL ACADEMIC CONTEXT INJECTED BELOW]\n"
					systemContext += contextBuilder.String()
					log.Printf("[AI-CHAT] Injecting %d bytes of total context for Recommendation ID: %d", len(contextBuilder.String()), recoID)
				}
			} else {
				log.Printf("[AI-CHAT] Failed to fetch Recommendation for ID: %d. Error: %v", recoID, err)
			}
		}
	}

	// -------------------------------------------------------------------------
	// NEW: Inject Real-time Scholarships from Database
	// -------------------------------------------------------------------------
	scholarships, err := s.store.ListRecentScholarshipsByUser(c.Context(), db.ListRecentScholarshipsByUserParams{
		UserUsername: payload.Username,
		Limit:        10, // Fetch top 10 most recent/relevant
	})

	if err == nil && len(scholarships) > 0 {
		var sb strings.Builder
		sb.WriteString("\n\n=== AVAILABLE SCHOLARSHIP OPPORTUNITIES (FROM DATABASE) ===\n")
		sb.WriteString("Use this list if the user asks about financial aid, funding, or scholarships.\n\n")

		for i, sch := range scholarships {
			matchScore := 0.0
			if sch.MatchScore.Valid {
				matchScore = sch.MatchScore.Float64
			}

			// Format: 1. Title (Match: X%)
			sb.WriteString(fmt.Sprintf("%d. %s (Match: %.0f%%)\n", i+1, sch.Title, matchScore))

			// Add Description (truncated)
			if sch.Description.Valid {
				desc := sch.Description.String
				if len(desc) > 200 {
					desc = desc[:200] + "..."
				}
				sb.WriteString(fmt.Sprintf("   Context: %s\n", desc))
			}

			// Add Link
			if sch.Link.Valid {
				sb.WriteString(fmt.Sprintf("   Link: %s\n", sch.Link.String))
			}
			sb.WriteString("\n")
		}
		
		// Append to the main system context
		systemContext += sb.String()
		log.Printf("[AI-CHAT] Injected %d scholarships from DB into context.", len(scholarships))
	} else if err != nil {
		log.Printf("[AI-CHAT] Failed to fetch scholarships for user %s: %v", payload.Username, err)
	}
	// -------------------------------------------------------------------------

	// --- Build messages for OpenAI (incorporate systemContext) ---
	var openAIMessages []map[string]string

	// VITAL: Insert the enhanced system context as the first message
	openAIMessages = append(openAIMessages, map[string]string{
		"role":    "system",
		"content": systemContext,
	})

	// Append user history and current message
	for _, m := range req.Messages {
		role := strings.ToLower(strings.TrimSpace(m.Role))
		if role != "user" && role != "assistant" && role != "system" {
			role = "user"
		}
		content := strings.TrimSpace(m.Content)
		if content != "" {
			openAIMessages = append(openAIMessages, map[string]string{
				"role":    role,
				"content": content,
			})
		}
	}
	// --- End Message Build ---

	// --- Setup streaming response headers ---
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")

	rawWriter := c.Response().BodyWriter()
	writer := bufio.NewWriter(rawWriter)

	// --- Prepare OpenAI streaming request ---
	body := map[string]any{
		"model":    s.config.OpenAIModel,
		"messages": openAIMessages,
		"stream":   true,
	}
	bodyBytes, _ := json.Marshal(body)

	reqOpenAI, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(bodyBytes))
	if err != nil {
		log.Printf("[CHAT-STREAM] Build OpenAI request error: %v", err)
		fmt.Fprintf(writer, "event: error\ndata: build error\n\n")
		writer.Flush()
		return nil
	}
	reqOpenAI.Header.Set("Content-Type", "application/json")
	reqOpenAI.Header.Set("Authorization", "Bearer "+s.config.OpenAIAPIKey)

	client := &http.Client{}
	resp, err := client.Do(reqOpenAI)
	if err != nil {
		log.Printf("[CHAT-STREAM] OpenAI connection error: %v", err)
		fmt.Fprintf(writer, "event: error\ndata: connection failed\n\n")
		writer.Flush()
		return nil
	}
	defer resp.Body.Close()

	// --- Process Stream ---
	reader := bufio.NewReader(resp.Body)

	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			if err != io.EOF {
				log.Printf("[CHAT-STREAM] Read error: %v", err)
			}
			break
		}

		text := strings.TrimSpace(string(line))
		if text == "" {
			continue
		}

		if !strings.HasPrefix(text, "data: ") {
			continue
		}

		data := strings.TrimSpace(strings.TrimPrefix(text, "data: "))
		if data == "" {
			continue
		}

		if data == "[DONE]" {
			break
		}

		// Parse OpenAI streaming chunk
		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		if len(chunk.Choices) == 0 {
			continue
		}

		token := chunk.Choices[0].Delta.Content
		if token == "" {
			continue
		}

		// Escape newlines for SSE format
		escaped := strings.ReplaceAll(token, "\n", "\\n")
		fmt.Fprintf(writer, "data: %s\n\n", escaped)
		writer.Flush()
	}

	fmt.Fprint(writer, "data: [DONE]\n\n")
	writer.Flush()
	return nil
}