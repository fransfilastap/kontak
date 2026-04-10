import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/** Matches stored upload names like `A51B20D4214C2881EB02203FE333D667-video.mp4`. */
const SAFE_MEDIA_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename: raw } = await params;
  if (!raw) {
    return NextResponse.json({ error: "Filename required" }, { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  if (!SAFE_MEDIA_FILENAME.test(decoded) || decoded.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const apiUrl = process.env.KONTAK_API_URL || "http://localhost:8080";
  const baseUrl = apiUrl.replace(/\/v1\/?$/, "");
  const targetUrl = `${baseUrl}/api/media/${encodeURIComponent(decoded)}`;

  try {
    const response = await fetch(targetUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

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
