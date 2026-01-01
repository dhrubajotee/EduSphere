# server/Dockerfile

# ------------------------------------------------------------------------------
# Build Stage
# ------------------------------------------------------------------------------
FROM golang:alpine AS builder
WORKDIR /app

# Install dependencies for CGO (required by gosseract and linking external libs)
# - build-base: contains gcc, g++, etc.
# - tesseract-ocr-dev: contains C headers for compilation
# - leptonica-dev: image processing lib headers
# - poppler-dev: required for pdftoppm linkage
RUN apk add --no-cache build-base tesseract-ocr-dev leptonica-dev pkgconfig poppler-dev

# Explicitly set the path for Tesseract language files (Only required for compilation stage, but harmless)
ENV TESSDATA_PREFIX /usr/share/tessdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main main.go

# ------------------------------------------------------------------------------
# Run Stage
# ------------------------------------------------------------------------------
FROM alpine:3.19
WORKDIR /app

# Install Runtime Dependencies
# - tesseract-ocr: required for the compiled app to run OCR
# - poppler-utils: required for 'pdftoppm' command (pdf -> image conversion)
# VITAL FIX: Added tesseract-ocr-data-eng to resolve the 'failed to initialize TessBaseAPI with code -1' error.
RUN apk add --no-cache curl tesseract-ocr poppler-utils tesseract-ocr-data-eng

# CRITICAL FIX: Set the ENV variable in the RUN STAGE for runtime execution!
# This ensures gosseract can find the 'eng.traineddata' file inside the container.
ENV TESSDATA_PREFIX /usr/share/tessdata 

# Ensure common binary paths are in the runtime PATH
# This ensures executables like 'pdftoppm' are found by Go's exec.Command
ENV PATH /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/app

# Copy binary from builder
COPY --from=builder /app/main .
COPY --from=builder /app/app.env .
COPY --from=builder /app/db/migration ./db/migration

EXPOSE 8080
CMD ["/app/main"]