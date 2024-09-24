# Use the official Golang image as the base image
FROM golang:1.22-alpine AS builder

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source from the current directory to the Working Directory inside the container
COPY . .

# Build the Go app
RUN go build -o main cmd/main.go

# Start a new stage from scratch
FROM alpine:latest  

WORKDIR /root/

# Copy the Pre-built binary file from the previous stage
COPY --from=builder /app/main .
# Set environment variables for PORT, HOST, DB, JWT_SECRET, INIT_USER, and INIT_PASS
ENV PORT ${PORT:-8080}
ENV HOST ${HOST:-'localhost'}
ENV DB ${DB:-'postgres://user:password@localhost:5432/dbname'}
ENV JWT_SECRET ${JWT_SECRET:-'your_jwt_secret'}
ENV INIT_USER ${INIT_USER:-'admin'}
ENV INIT_PASS ${INIT_PASS:-'password'}



# Expose port 8080 to the outside world
EXPOSE ${PORT}

# Command to run the executable
CMD ["./main"]
