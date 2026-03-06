.PHONY: swagger generate-client extract-client gen clean deps

# Generate OpenAPI spec from Go code
swagger:
	swag init -g cmd/main.go -o docs --parseDependency --parseInternal
	@# Fix missing info in swagger.json
	@jq '.info.title = "Kontak API" | .info.version = "1.0" | .info.description = "WhatsApp-to-REST-API bridge" | .info.contact = {"name":"API Support","url":"https://github.com/fransfilastap/kontak"} | .info.license = {"name":"Apache 2.0","url":"http://www.apache.org/licenses/LICENSE-2.0.html"} | .host = "localhost:8080" | .basePath = "/"' docs/swagger.json > docs/swagger.json.tmp && mv docs/swagger.json.tmp docs/swagger.json

# Generate TypeScript client from OpenAPI spec using hey-api
generate-client:
	rm -rf web/src/types/generated tmp/gen
	npx @hey-api/openapi-ts -f openapi-ts.config.ts

# Extract only API client and models from generated output
extract-client:
	rm -rf web/src/types/generated
	mkdir -p web/src/types/generated
	cp -r tmp/gen/* web/src/types/generated/
	# Create setup file to configure base URL
	@echo '// Generated client configuration - import this before using the SDK' > web/src/types/generated/config.ts
	@echo 'import { createConfig } from "./client";' >> web/src/types/generated/config.ts
	@echo 'import type { ClientOptions } from "./client";' >> web/src/types/generated/config.ts
	@echo '' >> web/src/types/generated/config.ts
	@echo 'const baseUrl = process.env.NEXT_PUBLIC_KONTAK_API_URL || "http://localhost:8080";' >> web/src/types/generated/config.ts
	@echo '' >> web/src/types/generated/config.ts
	@echo 'export const kontakConfig = createConfig<ClientOptions>({' >> web/src/types/generated/config.ts
	@echo '  baseUrl,' >> web/src/types/generated/config.ts
	@echo '});' >> web/src/types/generated/config.ts
	rm -rf tmp/gen

# Full pipeline: generate spec + client
gen: swagger generate-client extract-client

# Clean generated files
clean:
	rm -rf docs/swagger.json docs/swagger.yaml docs/docs.go
	rm -rf tmp/gen
	rm -rf web/src/types/generated

# Install dependencies for code generation
deps:
	go mod download
	cd web && pnpm add -D @hey-api/openapi-ts