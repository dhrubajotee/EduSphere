// server/api/helpers.go

package api

import (
	"database/sql"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// -----------------------------------------------------------------------------
//  HELPERS
// -----------------------------------------------------------------------------

// saveUploadedFile persists the uploaded file under the server's upload dir.
func (s *Server) saveUploadedFile(fileHeader *multipart.FileHeader) (string, error) {
	src, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), sanitizeFilename(fileHeader.Filename))
	dstPath := s.absUploadPath(filename)

	// Ensure upload dir exists
	if err := os.MkdirAll(filepath.Dir(dstPath), 0o755); err != nil {
		return "", err
	}

	out, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err := io.Copy(out, src); err != nil {
		return "", err
	}
	return dstPath, nil
}

func sanitizeFilename(name string) string {
	base := filepath.Base(name)
	base = strings.ReplaceAll(base, " ", "_")
	return base
}

// absUploadPath returns a full path inside the configured upload directory.
// Falls back to "./uploads" if not configured.
func (s *Server) absUploadPath(filename string) string {
	uploadDir := s.config.UploadDir
	if strings.TrimSpace(uploadDir) == "" {
		uploadDir = "uploads"
	}
	return filepath.Join(uploadDir, filename)
}

// sqlStringOrNull converts a string to sql.NullString properly.
func sqlStringOrNull(v string) sql.NullString {
	v = strings.TrimSpace(v)
	if v == "" {
		return sql.NullString{String: "", Valid: false}
	}
	return sql.NullString{String: v, Valid: true}
}

// parseIDParam safely parses a URL param as int64.
func parseIDParam(c *fiber.Ctx, name string) (int64, error) {
	raw := strings.TrimSpace(c.Params(name))
	if raw == "" {
		return 0, fmt.Errorf("missing %s", name)
	}
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid %s", name)
	}
	return id, nil
}

func coalesce(s sql.NullString, fallback string) string {
	if s.Valid && s.String != "" {
		return s.String
	}
	return fallback
}
