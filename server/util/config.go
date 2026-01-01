// server/util/config.go

package util

import (
	"time"

	// Used for configuration loading from various sources (YAML, environment variables, etc.)
	"github.com/spf13/viper"
)

// Config represents the application configuration loaded from a file or environment variables
type Config struct {
	DBDriver            string        `mapstructure:"DB_DRIVER"`
	DBSource            string        `mapstructure:"DB_SOURCE"`
	ServerAddress       string        `mapstructure:"SERVER_ADDRESS"`
	TokenSymmetricKey   string        `mapstructure:"TOKEN_SYMMETRIC_KEY"`
	AccessTokenDuration time.Duration `mapstructure:"ACCESS_TOKEN_DURATION"`
	AllowedOrigins      string        `mapstructure:"ALLOWED_ORIGINS"`
	UploadDir           string        `mapstructure:"UPLOAD_DIR"`

	// AI Inference (OpenAI)
	OpenAIAPIKey       string `mapstructure:"OPENAI_API_KEY"`
	OpenAIModel        string `mapstructure:"OPENAI_MODEL"`
	OCRFallbackEnabled bool   `mapstructure:"OCR_FALLBACK_ENABLED"`

	// Web Search (Brave API)
	WebSearchEnabled    bool   `mapstructure:"WEB_SEARCH_ENABLED"`
	WebSearchMaxResults int    `mapstructure:"WEB_SEARCH_MAX_RESULTS"`
	WebSearchProvider   string `mapstructure:"WEB_SEARCH_PROVIDER"`
	BraveAPIKey         string `mapstructure:"BRAVE_API_KEY"`
	BraveAPIURL         string `mapstructure:"BRAVE_API_URL"`
}

// LoadConfig reads the application configuration from a specified file or environment variables
func LoadConfig(path string) (config Config, err error) {
	// Add the provided path as a potential location for the configuration file
	viper.AddConfigPath(path)

	// Set the configuration file name to "app"
	viper.SetConfigName("app")

	// Set the configuration file type to environment variables (".env")
	viper.SetConfigType("env")

	// Automatically map environment variables with a "APP_" prefix to configuration keys (e.g., APP_DB_DRIVER becomes DB_DRIVER)
	viper.AutomaticEnv()

	// Sensible defaults
	viper.SetDefault("OPENAI_MODEL", "gpt-4o-mini")
	viper.SetDefault("OCR_FALLBACK_ENABLED", true)
	viper.SetDefault("UPLOAD_DIR", "uploads")

	viper.SetDefault("WEB_SEARCH_PROVIDER", "brave")
	viper.SetDefault("WEB_SEARCH_ENABLED", true)
	viper.SetDefault("WEB_SEARCH_MAX_RESULTS", 5)
	viper.SetDefault("BRAVE_API_URL", "https://api.search.brave.com/res/v1/web/search")

	// Attempt to read the configuration file
	err = viper.ReadInConfig()
	if err != nil {
		// Return an error if the configuration file cannot be read
		return
	}

	// Unmarshal the loaded configuration data into the Config struct
	err = viper.Unmarshal(&config)
	return
}
