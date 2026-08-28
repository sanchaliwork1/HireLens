import { NextRequest, NextResponse } from "next/server"
import { extractTextFromFile } from "@/lib/pdf"

export const runtime = "nodejs" // pdf-parse needs Node, not the Edge runtime

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded under field name 'file'." }, { status: 400 })
    }

    const text = await extractTextFromFile(file)

    if (!text || text.length < 20) {
      return NextResponse.json(
        {
          error:
            "Couldn't extract readable text from this file. If it's a scanned/image-based PDF, you'll need OCR first — try pasting the text directly instead.",
        },
        { status: 422 },
      )
    }

    return NextResponse.json({ filename: file.name, text })
  } catch (err) {
    console.error("extract-text error", err)
    return NextResponse.json({ error: "Failed to read file." }, { status: 500 })
  }
}
