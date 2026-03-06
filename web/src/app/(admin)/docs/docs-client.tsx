"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Copy, BookOpen, ChevronRight, Server, Terminal,
  CheckCircle2, AlertTriangle, Play, FileJson
} from "lucide-react";
import type { EndpointData, EndpointPayloadProperty } from "./endpoints";

interface DocsClientProps {
  endpoints: EndpointData[];
}

export function DocsClient({ endpoints }: DocsClientProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointData | null>(
    endpoints.length > 0 ? endpoints[0] : null
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast.success("Example copied to clipboard");
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  const renderPayloadProperty = (prop: EndpointPayloadProperty, depth = 0) => {
    return (
      <div key={prop.name} className={`flex flex-col py-3 ${depth > 0 ? 'ml-4 border-l pl-4 border-border/40 my-1' : 'border-b border-border/40 last:border-0'}`}>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-semibold text-foreground">{prop.name}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono text-muted-foreground bg-muted/30">
              {prop.type}
            </Badge>
            {prop.required && (
              <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 text-[10px] h-5 px-1.5 font-medium">
                required
              </Badge>
            )}
          </div>
        </div>
        
        {prop.description && (
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
            {prop.description}
          </p>
        )}
        
        {prop.nested && prop.nested.length > 0 && (
          <div className="mt-2 bg-muted/10 rounded-md">
            {prop.nested.map(nestedProp => renderPayloadProperty(nestedProp, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 lg:w-80 border-r bg-muted/10 flex flex-col h-full shrink-0">
        <div className="p-4 border-b bg-background flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>API Reference</span>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 flex flex-col gap-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
              Endpoints
            </div>
            {endpoints.map((endpoint, i) => (
              <button
                key={i}
                onClick={() => setSelectedEndpoint(endpoint)}
                className={`flex flex-col items-start gap-1 w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                  selectedEndpoint?.path === endpoint.path && selectedEndpoint?.method === endpoint.method
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded min-w-[38px] text-center ${
                    endpoint.method === "GET"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {endpoint.method}
                  </span>
                  <span className={`text-[13px] font-medium truncate ${
                    selectedEndpoint?.path === endpoint.path && selectedEndpoint?.method === endpoint.method
                      ? "text-primary font-semibold"
                      : "text-foreground"
                  }`}>
                    {endpoint.summary || endpoint.path}
                  </span>
                </div>
                <div className="text-[11px] font-mono opacity-70 truncate w-full pl-11">
                  {endpoint.path}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      {selectedEndpoint ? (
        <ScrollArea className="flex-1 bg-background h-full">
          <div className="p-6 md:p-10 max-w-5xl mx-auto animate-in fade-in duration-300">
            {/* Header section */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className={`text-sm px-2.5 py-1 ${
                    selectedEndpoint.method === "GET"
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                  }`}>
                  <span className={`mr-2 h-1.5 w-1.5 rounded-full inline-block ${
                    selectedEndpoint.method === "GET" ? "bg-blue-500" : "bg-emerald-500"
                  }`} />
                  {selectedEndpoint.method}
                </Badge>
                <code className="text-[15px] font-mono font-semibold tracking-tight text-foreground bg-muted/40 px-3 py-1 rounded-md border">
                  {selectedEndpoint.path}
                </code>
              </div>
              
              <h1 className="text-2xl font-bold tracking-tight mb-2">{selectedEndpoint.summary}</h1>
              {selectedEndpoint.description && (
                <p className="text-muted-foreground text-[15px] leading-relaxed max-w-3xl">
                  {selectedEndpoint.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-12">
              {/* Properties Column */}
              <div className="flex flex-col gap-8">
                {/* Headers */}
                {selectedEndpoint.headers && selectedEndpoint.headers.length > 0 && (
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Headers</h3>
                      </div>
                    </div>
                    <div className="px-5 py-2">
                      {selectedEndpoint.headers.map(header => (
                        <div key={header.name} className="flex flex-col py-3 border-b border-border/40 last:border-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[13px] font-semibold">{header.name}</span>
                            {header.required && (
                              <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20 transition-colors text-[10px] h-5 px-1.5 font-medium">
                                required
                              </Badge>
                            )}
                          </div>
                          <span className="text-[13px] font-mono text-muted-foreground">{header.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Payload */}
                {(selectedEndpoint.payload && selectedEndpoint.payload.length > 0) ? (
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">
                          {selectedEndpoint.isMultipart ? 'Form Data' : 'Request Body'}
                        </h3>
                      </div>
                      {selectedEndpoint.isMultipart && (
                        <Badge variant="outline" className="text-[10px] font-mono">multipart/form-data</Badge>
                      )}
                    </div>
                    <div className="px-5 py-2">
                      {selectedEndpoint.payload.map(prop => renderPayloadProperty(prop))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden border-dashed">
                     <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted/50 flex flex-col items-center justify-center">
                          <FileJson className="h-5 w-5 text-muted-foreground/60" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">No request body</p>
                          <p className="text-xs text-muted-foreground mt-1">This endpoint does not require a payload.</p>
                        </div>
                     </div>
                  </div>
                )}
              </div>

              {/* Example Column */}
              <div className="flex flex-col gap-4 sticky top-6 self-start">
                <div className="rounded-xl border bg-zinc-950 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-zinc-400" />
                      <span className="text-xs font-semibold text-zinc-300">Request Example</span>
                    </div>
                    {selectedEndpoint.example && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                        onClick={() => handleCopy(selectedEndpoint.example || "")}
                      >
                        {copiedText === selectedEndpoint.example ? (
                          <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Copied</>
                        ) : (
                          <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy</>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {selectedEndpoint.example ? (
                    <div className="relative group">
                      <pre className="p-5 overflow-x-auto text-[13px] font-mono leading-relaxed text-zinc-300 selection:bg-zinc-800 max-h-[500px]">
                        <code>
                          {selectedEndpoint.example.split('\n').map((line, i) => {
                            // Simple syntax highlighting for curl examples
                            let coloredLine = line;
                            if (line.includes('curl -X')) {
                              coloredLine = line.replace('curl', '<span class="text-pink-400">curl</span>')
                                               .replace('-X', '<span class="text-yellow-400">-X</span>')
                                               .replace(selectedEndpoint.method, `<span class="text-emerald-400">${selectedEndpoint.method}</span>`);
                            } else if (line.includes('https://')) {
                              coloredLine = `<span class="text-green-300">${line.replace(/\\$/, '<span class="text-zinc-500">\\</span>')}</span>`;
                            } else if (line.includes('-H ')) {
                              coloredLine = line.replace('-H', '<span class="text-yellow-400">-H</span>')
                                               .replace(/"(.*?)"/g, '<span class="text-green-300">"$1"</span>')
                                               .replace(/\\$/, '<span class="text-zinc-500">\\</span>');
                            } else if (line.includes('-d ') || line.includes('-F ')) {
                              coloredLine = line.replace('-d', '<span class="text-yellow-400">-d</span>')
                                                .replace('-F', '<span class="text-yellow-400">-F</span>')
                                                .replace(/\\$/, '<span class="text-zinc-500">\\</span>');
                            }
                            
                            return (
                              <div key={i} className="table-row">
                                <span className="table-cell text-right select-none text-zinc-700 pr-4 text-xs">{i + 1}</span>
                                <span className="table-cell whitespace-pre" dangerouslySetInnerHTML={{ __html: coloredLine }} />
                              </div>
                            );
                          })}
                        </code>
                      </pre>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-zinc-500 text-sm">
                      No example available for this endpoint.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-6">
          <div className="text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Select an endpoint</p>
            <p className="text-sm opacity-60 mt-1">Choose an endpoint from the sidebar to view its documentation.</p>
          </div>
        </div>
      )}
    </div>
  );
}
