// server/api/summaries.go

package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf"
	db "github.com/nibir1/go-fiber-postgres-REST-boilerplate/db/sqlc"
	"github.com/nibir1/go-fiber-postgres-REST-boilerplate/token"
)

type createSummaryReq struct {
	RecommendationID    int64  `json:"recommendation_id"`
	SummaryText         string `json:"summary_text"`
	IncludeScholarships bool   `json:"include_scholarships"`
}

// POST /api/summaries
func (s *Server) createSummaryPDF(c *fiber.Ctx) error {
	payload, ok := c.Locals(authorizationPayloadKey).(*token.Payload)
	if !ok || payload == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(errorResponse(fmt.Errorf("unauthorized")))
	}

	var req createSummaryReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(errorResponse(err))
	}

	// Validate recommendation ownership
	reco, err := s.store.GetRecommendation(c.Context(), req.RecommendationID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(errorResponse(fmt.Errorf("recommendation not found")))
	}
	if reco.UserUsername != payload.Username {
		return c.Status(fiber.StatusForbidden).JSON(errorResponse(fmt.Errorf("forbidden")))
	}

	// Fetch the most recent scholarships (avoid duplicates from past generations)
	scholarships, err := s.store.ListRecentScholarshipsByUser(c.Context(), db.ListRecentScholarshipsByUserParams{
		UserUsername: payload.Username,
		Limit:        10, // adjust if you ever want more
	})
	if err != nil {
		log.Printf("[WARN] Could not load latest scholarships for %s: %v", payload.Username, err)
		scholarships = []db.Scholarship{}
	}

	// 🔹 If no summary text provided, fallback to latest AI-generated summary (if exists)
	summaryText := strings.TrimSpace(req.SummaryText)
	if summaryText == "" {
		// Try to find last generated summary for the same user
		prevSummaries, _ := s.store.ListSummaries(c.Context(), payload.Username)
		if len(prevSummaries) > 0 && prevSummaries[0].SummaryText.Valid {
			summaryText = prevSummaries[0].SummaryText.String
		}
	}

	// 🔹 Generate PDF
	filename := fmt.Sprintf("summary_%d_%d.pdf", req.RecommendationID, time.Now().Unix())
	outPath := filepath.Join(s.summariesDir, filename)

	if err := writeRecoPDF(outPath, reco, summaryText, scholarships, payload.Username); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(fmt.Errorf("failed to create PDF: %v", err)))
	}

	// 🔹 Save summary record in DB
	row, err := s.store.CreateSummary(c.Context(), db.CreateSummaryParams{
		UserUsername:     payload.Username,
		RecommendationID: sqlNullInt64(req.RecommendationID),
		SummaryText:      sqlNullString(summaryText),
		PdfPath:          sqlNullString(outPath),
	})
	if err != nil {
		_ = os.Remove(outPath)
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(fmt.Errorf("failed to save summary: %v", err)))
	}

	log.Printf("[INFO] Summary PDF created for user %s: %s", payload.Username, outPath)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":         row.ID,
		"user":       payload.Username,
		"pdf_path":   row.PdfPath.String,
		"created_at": row.CreatedAt,
	})
}

// GET /api/summaries
func (s *Server) listSummaries(c *fiber.Ctx) error {
	payload, ok := c.Locals(authorizationPayloadKey).(*token.Payload)
	if !ok || payload == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(errorResponse(fmt.Errorf("unauthorized")))
	}
	items, err := s.store.ListSummaries(c.Context(), payload.Username)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(err))
	}
	return c.JSON(items)
}

// GET /api/summaries/:id/download
func (s *Server) downloadSummaryPDF(c *fiber.Ctx) error {
	payload, ok := c.Locals(authorizationPayloadKey).(*token.Payload)
	if !ok || payload == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(errorResponse(fmt.Errorf("unauthorized")))
	}

	id, err := parseIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(errorResponse(err))
	}

	// Get summary for the authorized user
	sum, err := s.store.GetSummary(c.Context(), db.GetSummaryParams{
		ID:           id,
		UserUsername: payload.Username,
	})
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(errorResponse(fmt.Errorf("summary not found")))
	}
	if sum.UserUsername != payload.Username {
		return c.Status(fiber.StatusForbidden).JSON(errorResponse(fmt.Errorf("forbidden")))
	}

	// ✅ Check that pdf_path exists and is valid
	if !sum.PdfPath.Valid || strings.TrimSpace(sum.PdfPath.String) == "" {
		return c.Status(fiber.StatusNotFound).JSON(errorResponse(fmt.Errorf("summary file path missing in database")))
	}

	// ✅ Check file existence before serving
	if _, err := os.Stat(sum.PdfPath.String); os.IsNotExist(err) {
		log.Printf("[WARN] Missing PDF file for summary ID %d at path %s", id, sum.PdfPath.String)
		return c.Status(fiber.StatusNotFound).JSON(errorResponse(fmt.Errorf("summary file not found on server")))
	}

	// ✅ Serve file if it exists
	return c.Download(sum.PdfPath.String)
}

// DELETE /api/summaries/:id
func (s *Server) deleteSummary(c *fiber.Ctx) error {
	payload, ok := c.Locals(authorizationPayloadKey).(*token.Payload)
	if !ok || payload == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(errorResponse(fmt.Errorf("unauthorized")))
	}

	id, err := parseIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(errorResponse(err))
	}

	// Fetch the summary (authorized for current user)
	sum, err := s.store.GetSummary(c.Context(), db.GetSummaryParams{
		ID:           id,
		UserUsername: payload.Username,
	})
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(errorResponse(fmt.Errorf("summary not found")))
	}
	if sum.UserUsername != payload.Username {
		return c.Status(fiber.StatusForbidden).JSON(errorResponse(fmt.Errorf("forbidden")))
	}

	// ✅ Delete PDF file from disk if exists
	if sum.PdfPath.Valid && strings.TrimSpace(sum.PdfPath.String) != "" {
		if err := os.Remove(sum.PdfPath.String); err != nil {
			if os.IsNotExist(err) {
				log.Printf("[WARN] Tried to delete missing PDF for summary ID %d: %s", id, sum.PdfPath.String)
			} else {
				log.Printf("[WARN] Failed to delete PDF for summary ID %d: %v", id, err)
			}
		} else {
			log.Printf("[INFO] Deleted PDF file for summary ID %d: %s", id, sum.PdfPath.String)
		}
	}

	// ✅ Delete DB record
	err = s.store.DeleteSummary(c.Context(), db.DeleteSummaryParams{
		ID:           id,
		UserUsername: payload.Username,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(fmt.Errorf("failed to delete summary: %v", err)))
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ---- PDF Generation ----
// writeRecoPDF generates a professional PDF report including summary, courses, and scholarships.
func writeRecoPDF(path string, reco db.Recommendation, summaryText string, scholarships []db.Scholarship, username string) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// --- Header ---
	pdf.SetFont("Helvetica", "B", 18)
	pdf.Cell(0, 10, "EduSphere Academic Summary Report")
	pdf.Ln(12)

	pdf.SetFont("Helvetica", "", 11)
	pdf.Cell(0, 6, fmt.Sprintf("Generated for: %s", username))
	pdf.Ln(6)
	pdf.Cell(0, 6, fmt.Sprintf("Date: %s", time.Now().Format("January 2, 2006, 15:04")))
	pdf.Ln(10)

	// --- Summary Section ---
	summaryText = strings.TrimSpace(cleanText(summaryText))
	if summaryText != "" {
		pdf.SetFont("Helvetica", "B", 14)
		pdf.Cell(0, 8, "Transcript Summary")
		pdf.Ln(8)

		pdf.SetFont("Helvetica", "", 11)
		pdf.MultiCell(0, 6, summaryText, "", "", false)
		pdf.Ln(8)
	}

	// --- Recommended Courses ---
	pdf.SetFont("Helvetica", "B", 14)
	pdf.Cell(0, 8, "Recommended Courses")
	pdf.Ln(10)
	pdf.SetFont("Helvetica", "", 11)

	// VITAL FIX: Changed JSON tag from "rationale" back to "description"
	// to match the field name saved by the ai_recommendations.go handler.
	type RecoCourse struct {
		Type        string  `json:"type"`
		Title       string  `json:"title"`
		Description string  `json:"description"` // <--- FIXED: The JSON key in the DB is "description"
		Match       float64 `json:"match"`
		Code        string  `json:"code"`
		Link        string  `json:"link"`
		CourseID    int64   `json:"course_id"`
	}

	var payload struct {
		Courses []RecoCourse `json:"courses"`
	}
	_ = json.Unmarshal(reco.Payload, &payload)

	if len(payload.Courses) == 0 {
		pdf.MultiCell(0, 6, "No recommended courses available for this record.", "", "", false)
		pdf.Ln(4)
	} else {
		for i, c := range payload.Courses {
			// 1. Print Title, Code, and Match Score
			pdf.SetFont("Helvetica", "B", 12)
			titleLine := fmt.Sprintf("%d) %s (%s) - Match: %.0f%%",
				i+1, cleanText(c.Title), cleanText(c.Code), c.Match)
			pdf.MultiCell(0, 6, titleLine, "", "", false)
			pdf.SetFont("Helvetica", "", 11)

			// 2. Print Rationale/Description
			pdf.MultiCell(0, 6, fmt.Sprintf("Rationale: %s", cleanText(c.Description)), "", "", false) 

			// 3. Print Link (Clickable)
			if strings.TrimSpace(c.Link) != "" {
				link := strings.TrimSpace(c.Link)
				pdf.SetTextColor(0, 0, 255)
				pdf.WriteLinkString(6, "Course Link", link) // Use "Course Link" instead of the long URL text
				pdf.SetTextColor(0, 0, 0)
			}
			pdf.Ln(6) // Add extra line break after each course
		}
	}

	// --- Scholarships Section ---
	if len(scholarships) > 0 {
		pdf.Ln(8)
		pdf.SetFont("Helvetica", "B", 14)
		pdf.Cell(0, 8, "Scholarship Opportunities")
		pdf.Ln(10)
		pdf.SetFont("Helvetica", "", 11)

		// Deduplicate by title (case-insensitive)
		seen := make(map[string]bool)
		unique := make([]db.Scholarship, 0, len(scholarships))
		for _, s := range scholarships {
			key := strings.ToLower(strings.TrimSpace(s.Title))
			if key == "" || seen[key] {
				continue
			}
			seen[key] = true
			unique = append(unique, s)
		}

		for i, sch := range unique {
			title := cleanText(sch.Title)
			desc := "No description available."
			if sch.Description.Valid && strings.TrimSpace(sch.Description.String) != "" {
				desc = cleanText(sch.Description.String)
			}
			match := ""
			if sch.MatchScore.Valid {
				match = fmt.Sprintf("(Match: %.1f%%)", sch.MatchScore.Float64)
			}

			pdf.MultiCell(0, 6,
				fmt.Sprintf("%d) %s %s\n%s\n", i+1, title, match, desc),
				"", "", false)

			// Render link (clickable + wrapped)
			if sch.Link.Valid && strings.TrimSpace(sch.Link.String) != "" {
				link := strings.TrimSpace(sch.Link.String)
				pdf.SetTextColor(0, 0, 255)
				linkWidth := pdf.GetStringWidth(link)
				if linkWidth > 190 { // wrap long URLs
					pdf.MultiCell(0, 6, link, "", "", false)
				} else {
					pdf.WriteLinkString(6, link, link)
				}
				pdf.SetTextColor(0, 0, 0)
				pdf.Ln(4)
			}
		}
	}

	// --- Save PDF ---
	if err := pdf.OutputFileAndClose(filepath.Clean(path)); err != nil {
		return fmt.Errorf("failed to write PDF: %v", err)
	}
	return nil
}

// cleanText removes HTML, escaped characters, and non-printable symbols.
func cleanText(s string) string {
	s = html.UnescapeString(s)                          // convert entities like &amp;
	s = strings.ReplaceAll(s, "\u00a0", " ")           // remove nbsp
	s = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(s, "") // strip tags
	return strings.TrimSpace(s)
}

// sqlNullInt64 converts an int64 to sql.NullInt64 treating zero as null.
func sqlNullInt64(n int64) sql.NullInt64 {
	if n == 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: n, Valid: true}
}

// sqlNullString converts a string to sql.NullString treating empty string as null.
func sqlNullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}