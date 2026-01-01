// server/api/server.go

package api

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"

	db "github.com/nibir1/go-fiber-postgres-REST-boilerplate/db/sqlc"
	"github.com/nibir1/go-fiber-postgres-REST-boilerplate/token"
	"github.com/nibir1/go-fiber-postgres-REST-boilerplate/util"

	"github.com/gofiber/swagger"
	_ "github.com/nibir1/go-fiber-postgres-REST-boilerplate/docs"
)

// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization

// Server serves all HTTP routes for the EduSphere backend.
type Server struct {
	config       util.Config
	store        db.Store
	tokenMaker   token.Maker
	app          *fiber.App
	validate     *validator.Validate

	uploadsDir   string
	summariesDir string
}

// NewServer creates and configures a new Fiber web server.
func NewServer(config util.Config, store db.Store) (*Server, error) {
	tokenMaker, err := token.NewPasetoMaker(config.TokenSymmetricKey)
	if err != nil {
		return nil, fmt.Errorf("cannot create token maker: %w", err)
	}

	app := fiber.New(fiber.Config{})

	// --- Global Middleware ---
	app.Use(logger.New())

	allowedOrigins := config.AllowedOrigins
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173,http://localhost:3000"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		ExposeHeaders:    "Content-Length, Content-Type",
		AllowCredentials: true,
	}))

	validate := validator.New()
	validate.RegisterValidation("currency", validCurrency)

	server := &Server{
		config:       config,
		store:        store,
		tokenMaker:   tokenMaker,
		app:          app,
		validate:     validate,
		uploadsDir:   "./uploads",
		summariesDir: "./summaries",
	}

	// Ensure upload and summary directories exist
	_ = os.MkdirAll(server.uploadsDir, 0o755)
	_ = os.MkdirAll(server.summariesDir, 0o755)

	// Register all API routes
	server.setUpRoutes()
	return server, nil
}

// setUpRoutes defines all EduSphere API endpoints.
func (server *Server) setUpRoutes() {
	app := server.app

	// Swagger for interactive API docs
	app.Get("/swagger/*", swagger.HandlerDefault)

	// --- PUBLIC ROUTES ---
	api := app.Group("/api")
	api.Post("/users", server.createUser)
	api.Post("/users/login", server.loginUser)

	// --- Web Search ---
	api.Get("/websearch", server.handleLocalWebSearch)

	// --- PROTECTED ROUTES (Require Authorization) ---
	auth := api.Group("/", authMiddlewareFiber(server.tokenMaker))

	// ====== EDU-SPHERE CORE FEATURES ======

	// --- Transcript Management ---
	auth.Post("/transcripts/upload", server.uploadTranscript)
	auth.Get("/transcripts", server.listTranscripts)
	auth.Get("/transcripts/:id", server.getTranscript)

	// --- Recommendations ---
	// Create (Smart Filtered Recommendation)
	auth.Post("/recommendations", server.createRecommendation)

	// List & Get (History)
	auth.Get("/recommendations", server.listRecommendations)
	auth.Get("/recommendations/:id", server.getRecommendation)
	
	// ⭐ VITAL FIX: Register the DELETE route for removing a recommended course
	auth.Delete("/recommendations/:reco_id/courses/:course_id", server.deleteCourseFromRecommendation)

	// REMOVED: auth.Post("/recommendations/generate", ...) because we merged it into createRecommendation

	// --- Scholarships (AI + Web Search) ---
	auth.Post("/scholarships/generate", server.generateScholarships)

	// --- Summaries ---
	// Step 1: Generate summary text (AI only, not saved)
	auth.Post("/summaries/generate", server.generateSummary)

	// Step 2: Create & save PDF (includes summary + recommendations + scholarships)
	auth.Post("/summaries", server.createSummaryPDF)

	// Step 3: Manage summaries
	auth.Get("/summaries", server.listSummaries)             // List user's saved PDFs
	auth.Get("/summaries/:id/download", server.downloadSummaryPDF) // Download a specific PDF
	auth.Delete("/summaries/:id", server.deleteSummary)         // Delete summary + file

	// --- Simple AI Chat (for debugging/testing) ---
	auth.Post("/chat/stream", server.chatStream)
}

// Start launches the Fiber HTTP server and warms up the OpenAI model.
func (s *Server) Start(address string) error {
	// Warm up OpenAI model to reduce first-request latency
	go func() {
		log.Println("[INIT] Warming up OpenAI chat model...")
		if s.config.OpenAIAPIKey == "" {
			log.Println("[INIT] Skipping OpenAI warmup: OPENAI_API_KEY not set")
			return
		}
		_, err := callOpenAIChat(context.Background(), s.config.OpenAIAPIKey, s.config.OpenAIModel, []aiMessage{
			{Role: "system", Content: "You are EduSphere, an academic assistant."},
			{Role: "user", Content: "Say hello briefly."},
		}, false)
		if err != nil {
			log.Printf("[INIT] OpenAI warmup failed: %v", err)
		} else {
			log.Println("[INIT] OpenAI model reachable ✅")
		}
	}()

	// Start Fiber server
	return s.app.Listen(address)
}

// errorResponse provides a consistent JSON error payload.
func errorResponse(err error) fiber.Map {
	return fiber.Map{"error": err.Error()}
}