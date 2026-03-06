import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './docs/swagger.json',
  output: './tmp/gen',
  plugins: [
    {
      name: "@hey-api/client-next",
      runtimeConfigPath: "./kontakRuntimeConfig.ts",
    },
  ], 
})