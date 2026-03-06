const fs = require('fs');
const path = require('path');

const swaggerPath = path.resolve(__dirname, '../../docs/swagger.json');
const outputPath = path.resolve(__dirname, '../src/app/(admin)/docs/endpoints.ts');

const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

function resolveType(propType, itemsType) {
  if (propType === 'array' && itemsType) {
    return `${itemsType}[]`;
  }
  return propType || 'any';
}

function resolveRef(ref) {
  if (!ref) return null;
  const defName = ref.replace('#/definitions/', '');
  return swagger.definitions[defName];
}

function parseSchema(schema, name = 'body') {
  if (!schema) return [];
  
  if (schema.$ref) {
    const def = resolveRef(schema.$ref);
    if (!def) return [];
    return parseProperties(def.properties || {}, def.required || []);
  }
  
  if (schema.properties) {
    return parseProperties(schema.properties, schema.required || []);
  }
  
  return [];
}

function parseProperties(properties, requiredList) {
  const result = [];
  for (const [key, prop] of Object.entries(properties)) {
    let type = resolveType(prop.type, prop.items ? prop.items.type : null);
    
    // If it's a ref inside an object or array
    if (prop.$ref) {
      type = 'object';
    } else if (prop.type === 'array' && prop.items && prop.items.$ref) {
      type = 'object[]';
    }
    
    const isRequired = requiredList.includes(key);
    
    const parsedProp = {
      name: key,
      type: type,
      required: isRequired,
      description: prop.description || '',
    };
    
    // If nested object
    if (prop.$ref) {
      const def = resolveRef(prop.$ref);
      if (def && def.properties) {
         parsedProp.nested = parseProperties(def.properties, def.required || []);
      }
    } else if (prop.type === 'array' && prop.items && prop.items.$ref) {
      const def = resolveRef(prop.items.$ref);
      if (def && def.properties) {
         parsedProp.nested = parseProperties(def.properties, def.required || []);
      }
    }
    
    result.push(parsedProp);
  }
  return result;
}

function generateExample(payload, isMultipart) {
  if (!payload || payload.length === 0) return '';
  
  if (isMultipart) {
    let example = `curl -X POST \\\n  "https://api.kontak.com{PATH}" \\\n  -H "Authorization: Bearer <YOUR_KEY>"`;
    for (const prop of payload) {
      if (prop.type === 'file') {
        example += ` \\\n  -F "${prop.name}=@/path/to/file.jpg"`;
      } else {
        example += ` \\\n  -F "${prop.name}=value"`;
      }
    }
    return example;
  }
  
  const obj = {};
  for (const prop of payload) {
    if (prop.type === 'string') obj[prop.name] = "string";
    else if (prop.type === 'integer' || prop.type === 'number') obj[prop.name] = 0;
    else if (prop.type === 'boolean') obj[prop.name] = true;
    else if (prop.type === 'array' || prop.type?.includes('[]')) obj[prop.name] = [];
    else if (prop.type === 'object') obj[prop.name] = {};
    else obj[prop.name] = prop.type;
  }
  
  return `curl -X POST \\\n  "https://api.kontak.com{PATH}" \\\n  -H "Authorization: Bearer <YOUR_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(obj, null, 2)}'`;
}

function run() {
  const endpoints = [];
  
  for (const [endpointPath, methods] of Object.entries(swagger.paths)) {
    if (!endpointPath.startsWith('/v1/')) continue;
    
    for (const [method, operation] of Object.entries(methods)) {
      const headers = [
        { name: "Authorization", type: "string", required: true, description: "Bearer <YOUR_KEY>" }
      ];
      
      const parameters = [];
      let payload = [];
      let isMultipart = false;
      
      if (operation.parameters) {
        for (const param of operation.parameters) {
          if (param.in === 'header') {
            headers.push({ name: param.name, type: param.type || 'string', required: param.required, description: param.description });
          } else if (param.in === 'query' || param.in === 'path') {
            parameters.push({ name: param.name, type: param.type || 'string', required: param.required, description: param.description, in: param.in });
          } else if (param.in === 'body') {
            payload = parseSchema(param.schema, param.name);
          } else if (param.in === 'formData') {
            isMultipart = true;
            payload.push({
              name: param.name,
              type: param.type || 'string',
              required: param.required,
              description: param.description
            });
          }
        }
      }
      
      const example = generateExample(payload, isMultipart).replace('{PATH}', endpointPath);
      
      endpoints.push({
        method: method.toUpperCase(),
        path: endpointPath,
        summary: operation.summary || '',
        description: operation.description || '',
        headers,
        parameters,
        payload: payload.length > 0 ? payload : undefined,
        example: example || `curl -X ${method.toUpperCase()} \\\n  "https://api.kontak.com${endpointPath}" \\\n  -H "Authorization: Bearer <YOUR_KEY>"`,
        isMultipart
      });
    }
  }
  
  const tsContent = `// Automatically generated from swagger.json
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

export const endpointsData: EndpointData[] = ${JSON.stringify(endpoints, null, 2)};
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, tsContent);
  console.log(`Generated ${endpoints.length} endpoints at ${outputPath}`);
}

run();
