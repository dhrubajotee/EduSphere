// server/api/transcripts.go

package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"os/exec"
	"path/filepath"

	"github.com/otiai10/gosseract/v2"

	"github.com/gofiber/fiber/v2"
	"github.com/ledongthuc/pdf"
	db "github.com/nibir1/go-fiber-postgres-REST-boilerplate/db/sqlc"
	"github.com/nibir1/go-fiber-postgres-REST-boilerplate/token"
)

// -----------------------------------------------------------------------------
// PDF TEXT EXTRACTION (stubs you can wire to ledongthuc/pdf or gosseract)
// -----------------------------------------------------------------------------

// extractPDFText extracts text from a PDF file if it contains selectable text.
func extractPDFText(path string) (string, error) {
	f, r, err := pdf.Open(path)
	if err != nil {
		return "", fmt.Errorf("failed to open PDF: %w", err)
	}
	defer f.Close()

	var buf strings.Builder
	b, err := r.GetPlainText()
	if err != nil {
		return "", fmt.Errorf("failed to extract text: %w", err)
	}

	_, err = io.Copy(&buf, b)
	if err != nil {
		return "", fmt.Errorf("failed to read PDF text: %w", err)
	}

	text := buf.String()
	if strings.TrimSpace(text) == "" {
		return "", errors.New("no text extracted (possible scanned PDF)")
	}

	return text, nil
}

// ocrPDFToText runs OCR using Tesseract via gosseract to extract text from scanned PDFs.
func ocrPDFToText(pdfPath string) (string, error) {
	// Step 1: Convert the PDF pages to images (using pdftoppm from poppler-utils)
	tempDir := os.TempDir()
	outputPrefix := filepath.Join(tempDir, fmt.Sprintf("ocr_%d", time.Now().UnixNano()))
	
	// For local testing, you might use:
	// cmd := exec.Command("pdftoppm", "-png", pdfPath, outputPrefix)

	// Use the ABSOLUTE PATH for pdftoppm to ensure execution in Docker
	cmd := exec.Command("/usr/bin/pdftoppm", "-png", pdfPath, outputPrefix)
	
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("failed to convert pdf to images: %w", err)
	}

	// Step 2: Collect all generated PNGs
	files, err := filepath.Glob(outputPrefix + "-*.png")
	if err != nil {
		return "", fmt.Errorf("failed to list converted images: %w", err)
	}
	if len(files) == 0 {
		return "", errors.New("no image files found for OCR conversion")
	}

	// Step 3: OCR each image page
	// gosseract client initialization often needs TESSDATA_PREFIX to be set, 
	// but the Alpine image usually handles the default paths correctly.
	client := gosseract.NewClient()
	defer client.Close()
	client.SetLanguage("eng")

	var result strings.Builder
	for _, file := range files {
		if err := client.SetImage(file); err != nil {
			fmt.Printf("[DEBUG] Failed to set image %s: %v\n", file, err)
			continue
		}
		text, err := client.Text()
		if err != nil {
			fmt.Printf("[DEBUG] OCR failed on %s: %v\n", file, err)
			continue
		}
		result.WriteString(text + "\n")
		os.Remove(file) // cleanup
	}

	output := strings.TrimSpace(result.String())
	if output == "" {
		return "", errors.New("OCR produced empty text")
	}

	fmt.Printf("------------------------------------------------------------\n")
	fmt.Printf("[DEBUG] OCR Extracted text preview:\n\n%s\n", truncateString(output, 600))
	fmt.Printf("------------------------------------------------------------\n")

	return output, nil
}

// helper to truncate text for preview
func truncateString(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "...(truncated)"
}

// -----------------------------------------------------------------------------
// HANDLERS
// -----------------------------------------------------------------------------

// POST /api/transcripts/upload  (multipart/form-data: file=<pdf>)
func (s *Server) uploadTranscript(c *fiber.Ctx) error {
	// 0) Auth
	payload, ok := c.Locals(authorizationPayloadKey).(*token.Payload)
	if !ok || payload == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(errorResponse(fmt.Errorf("unauthorized")))
	}

	// 1) Validate file presence and type
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(errorResponse(fmt.Errorf("missing file: %w", err)))
	}
	if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".pdf") {
		return c.Status(fiber.StatusBadRequest).JSON(errorResponse(fmt.Errorf("only PDF files are allowed")))
	}

	// 2) Save the file
	path, err := s.saveUploadedFile(fileHeader)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(err))
	}

	// 3) Extract text (try normal first; optionally OCR if enabled)
	text, err := extractPDFText(path)
	meta := map[string]any{
		"ocr_used": false,
		"source":   "upload",
	}

	// DEBUG: Print a short preview of what text was extracted
	if err != nil {
		fmt.Println("[DEBUG] Text extraction failed:", err)
	} else {
		if len(text) > 0 {
			preview := text
			if len(preview) > 300 {
				preview = preview[:300] + "...(truncated)"
			}
			fmt.Println("------------------------------------------------------------")
			fmt.Println("[DEBUG] Extracted text preview:")
			fmt.Println(preview)
			fmt.Println("------------------------------------------------------------")
		} else {
			fmt.Println("[DEBUG] No text extracted from PDF.")
		}
	}

	if err != nil || strings.TrimSpace(text) == "" {
		// try OCR if allowed
		if s.config.OCRFallbackEnabled {
			txt, oerr := ocrPDFToText(path)
			if oerr == nil && strings.TrimSpace(txt) != "" {
				text = txt
				meta["ocr_used"] = true
			}
		}
	}

	// 4) Prepare DB payload
	metaJSON, _ := json.Marshal(meta)

	created, err := s.store.CreateTranscript(c.Context(), db.CreateTranscriptParams{
		UserUsername:  payload.Username,
		FilePath:      path,
		TextExtracted: sqlStringOrNull(text),
		Meta:          metaJSON,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(err))
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"id":         created.ID,
		"file_path":  created.FilePath,
		"created_at": created.CreatedAt,
		"text_bytes": len(text),
		"ocr_used":   meta["ocr_used"],
	})
}

// GET /api/transcripts
func (s *Server) listTranscripts(c *fiber.Ctx) error {
	// 0) Auth
	payload, ok := c.Locals(authorizationPayloadKey).(*token.Payload)
	if !ok || payload == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(errorResponse(fmt.Errorf("unauthorized")))
	}

	items, err := s.store.ListTranscripts(c.Context(), payload.Username)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(err))
	}
	return c.JSON(items)
}

// GET /api/transcripts/:id
func (s *Server) getTranscript(c *fiber.Ctx) error {
	// 0) Auth
	payload, ok := c.Locals(authorizationPayloadKey).(*token.Payload)
	if !ok || payload == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(errorResponse(fmt.Errorf("unauthorized")))
	}

	// 1) Parse path param
	id, err := parseIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(errorResponse(err))
	}

	// 2) Fetch transcript
	tr, err := s.store.GetTranscript(c.Context(), id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(errorResponse(fmt.Errorf("not found")))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(errorResponse(err))
	}

	// 3) Ownership check
	if tr.UserUsername != payload.Username {
		return c.Status(fiber.StatusForbidden).JSON(errorResponse(fmt.Errorf("forbidden")))
	}

	// 4) Prepare a short preview without slicing a non-string type
	preview := "(no text extracted)"
	if tr.TextExtracted.Valid {
		preview = tr.TextExtracted.String
		if len(preview) > 2000 {
			preview = preview[:2000] + "...(truncated)"
		}
	}

	return c.JSON(fiber.Map{
		"id":           tr.ID,
		"file_path":    tr.FilePath,
		"created_at":   tr.CreatedAt,
		"text_preview": preview,
	})
}
