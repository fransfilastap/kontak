// Automatically generated from swagger.json
export interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  in?: string; // query or path
}

export interface EndpointPayloadProperty {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  nested?: EndpointPayloadProperty[];
}

export interface EndpointData {
  method: string;
  path: string;
  summary: string;
  description: string;
  headers: EndpointParam[];
  parameters: EndpointParam[];
  payload?: EndpointPayloadProperty[];
  example?: string;
  isMultipart?: boolean;
}

export const endpointsData: EndpointData[] = [
  {
    "method": "POST",
    "path": "/v1/chats",
    "summary": "Send message",
    "description": "Send a text message via WhatsApp",
    "headers": [
      {
        "name": "Authorization",
        "type": "string",
        "required": true,
        "description": "Bearer <YOUR_KEY>"
      }
    ],
    "parameters": [],
    "payload": [
      {
        "name": "client_id",
        "type": "string",
        "required": true,
        "description": ""
      },
      {
        "name": "mobile_number",
        "type": "string",
        "required": true,
        "description": ""
      },
      {
        "name": "text",
        "type": "string",
        "required": true,
        "description": ""
      },
      {
        "name": "type",
        "type": "object",
        "required": true,
        "description": ""
      }
    ],
    "example": "curl -X POST \\\n  \"https://api.kontak.com/v1/chats\" \\\n  -H \"Authorization: Bearer <YOUR_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n  \"client_id\": \"string\",\n  \"mobile_number\": \"string\",\n  \"text\": \"string\",\n  \"type\": {}\n}'",
    "isMultipart": false
  },
  {
    "method": "POST",
    "path": "/v1/chats/media",
    "summary": "Send media message",
    "description": "Send a media message via WhatsApp",
    "headers": [
      {
        "name": "Authorization",
        "type": "string",
        "required": true,
        "description": "Bearer <YOUR_KEY>"
      }
    ],
    "parameters": [],
    "payload": [
      {
        "name": "client_id",
        "type": "string",
        "required": true,
        "description": "Client ID"
      },
      {
        "name": "mobile_number",
        "type": "string",
        "required": true,
        "description": "Mobile number"
      },
      {
        "name": "media_url",
        "type": "file",
        "required": true,
        "description": "Media file"
      },
      {
        "name": "caption",
        "type": "string",
        "description": "Caption",
      }
    ],
    "example": "curl -X POST \\\n  \"https://api.kontak.com/v1/chats/media\" \\\n  -H \"Authorization: Bearer <YOUR_KEY>\" \\\n  -F \"client_id=value\" \\\n  -F \"mobile_number=value\" \\\n  -F \"media_url=@/path/to/file.jpg\" \\\n  -F \"caption=value\"",
    "isMultipart": true
  },
  {
    "method": "POST",
    "path": "/v1/chats/template",
    "summary": "Send template message",
    "description": "Send a message using a template",
    "headers": [
      {
        "name": "Authorization",
        "type": "string",
        "required": true,
        "description": "Bearer <YOUR_KEY>"
      }
    ],
    "parameters": [],
    "payload": [
      {
        "name": "deviceId",
        "type": "string",
        "required": true,
        "description": ""
      },
      {
        "name": "templateId",
        "type": "string",
        "required": true,
        "description": ""
      },
      {
        "name": "to",
        "type": "string",
        "required": true,
        "description": ""
      },
      {
        "name": "variables",
        "type": "object",
        "required": false,
        "description": ""
      }
    ],
    "example": "curl -X POST \\\n  \"https://api.kontak.com/v1/chats/template\" \\\n  -H \"Authorization: Bearer <YOUR_KEY>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n  \"deviceId\": \"string\",\n  \"templateId\": \"string\",\n  \"to\": \"string\",\n  \"variables\": {}\n}'",
    "isMultipart": false
  }
];
