import type { ConfigFile } from '@hey-api/openapi-ts'

export default {
  input: './docs/swagger.json',
  output: './tmp/gen',
  client: 'fetch',
} satisfies ConfigFile