// server/api/websearch_brave.go

package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// WebResult defines a simplified search result structure returned to frontend
type WebResult struct {
	Title   string `json:"title"`
	URL     string `json:"url"`
	Snippet string `json:"snippet"`
}

// handleLocalWebSearch provides a local API endpoint proxying to Brave Search API
// GET /api/websearch?q=AI+scholarships
func (s *Server) handleLocalWebSearch(c *fiber.Ctx) error {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing q parameter"})
	}

	if s.config.BraveAPIKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Brave API key not configured"})
	}

	results, err := fetchBraveResults(query, s.config.BraveAPIKey, s.config.BraveAPIURL, s.config.WebSearchMaxResults)
	if err != nil {
		log.Printf("[WEB] Brave search failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(results)
}

// fetchBraveResults calls the Brave Search REST API directly
func fetchBraveResults(q, apiKey, baseURL string, maxResults int) ([]WebResult, error) {
	if baseURL == "" {
		baseURL = "https://api.search.brave.com/res/v1/web/search"
	}

	searchURL := fmt.Sprintf("%s?q=%s", baseURL, url.QueryEscape(q))

	req, _ := http.NewRequest("GET", searchURL, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-Subscription-Token", apiKey) // ✅ Brave requires this header (not Authorization)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("brave request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("brave returned %d: %s", resp.StatusCode, string(body))
	}

	var data struct {
		Web struct {
			Results []struct {
				Title       string `json:"title"`
				URL         string `json:"url"`
				Description string `json:"description"`
			} `json:"results"`
		} `json:"web"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 300))
		return nil, fmt.Errorf("invalid brave JSON: %v (partial body: %s)", err, string(body))
	}

	results := make([]WebResult, 0, len(data.Web.Results))
	for i, r := range data.Web.Results {
		if maxResults > 0 && i >= maxResults {
			break
		}
		results = append(results, WebResult{
			Title:   strings.TrimSpace(r.Title),
			URL:     strings.TrimSpace(r.URL),
			Snippet: strings.TrimSpace(r.Description),
		})
	}

	if len(results) == 0 {
		log.Printf("[WEB] Brave returned no results for query: %s", q)
	}

	return results, nil
}
