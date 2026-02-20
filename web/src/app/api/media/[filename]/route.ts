import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename) {
    return NextResponse.json({ error: "Filename required" }, { status: 400 });
  }

  // Find the base URL of the Go backend
  // fallback to localhost:8080 if not defined
  const apiUrl = process.env.KONTAK_API_URL || "http://localhost:8080/v1";
  
  // Replace '/v1' or '/api/v1' if present so we can reach the top level static folder
  const baseUrl = apiUrl.replace(/\/v1\/?$/, "");

  const targetUrl = `${baseUrl}/api/media/${filename}`;

  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
        return NextResponse.json(
            { error: `Backend returned ${response.status}` },
            { status: response.status }
        );
    }

    // Pass along headers like content-type, content-length, etc to the client
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Error proxying media:", error);
    return NextResponse.json(
        { error: "Failed to fetch media from backend" },
        { status: 500 }
    );
  }
}
