# Use the official Golang image as the base image
FROM golang:1.25-alpine AS builder

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

ARG PORT=8080
ARG HOST=localhost
ARG DB=postgres://user:password@localhost:5432/dbname
ARG JWT_SECRET=your_jwt_secret
ARG INIT_USER=admin
ARG INIT_PASS=password
ARG LOG_LEVEL=info
ARG LOG_FILE_ENABLED=true
ARG LOG_FILE_PATH=logs/kontak.log
ARG LOG_FILE_MAX_SIZE=100
ARG LOG_FILE_MAX_BACKUPS=3
ARG LOG_FILE_MAX_AGE=28
ARG LOG_FILE_COMPRESS=true

ENV PORT=${PORT}
ENV HOST=${HOST}
ENV DB=${DB}
ENV JWT_SECRET=${JWT_SECRET}
ENV INIT_USER=${INIT_USER}
ENV INIT_PASS=${INIT_PASS}
ENV LOG_LEVEL=${LOG_LEVEL}
ENV LOG_FILE_ENABLED=${LOG_FILE_ENABLED}
ENV LOG_FILE_PATH=${LOG_FILE_PATH}
ENV LOG_FILE_MAX_SIZE=${LOG_FILE_MAX_SIZE}
ENV LOG_FILE_MAX_BACKUPS=${LOG_FILE_MAX_BACKUPS}
ENV LOG_FILE_MAX_AGE=${LOG_FILE_MAX_AGE}
ENV LOG_FILE_COMPRESS=${LOG_FILE_COMPRESS}

# Expose port 8080 to the outside world
EXPOSE ${PORT}

# Command to run the executable
CMD ["./main"]