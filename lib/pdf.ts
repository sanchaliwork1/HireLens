// Runs only on the Node.js server runtime (see route.ts: `export const runtime = "nodejs"`).
// pdf-parse ships without types, hence the require + light 'any' cast.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse")

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return (data.text as string).trim()
}

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdfText(buffer)
  }

  // .docx would need mammoth (`pnpm add mammoth`) — left out to keep the
  // starter minimal since the sample data set is all PDFs. Add it here if
  // you need to accept Word files:
  //
  // if (name.endsWith(".docx")) {
  //   const mammoth = require("mammoth")
  //   const { value } = await mammoth.extractRawText({ buffer })
  //   return value.trim()
  // }

  // Fall back to treating it as plain text (.txt, .md, etc.)
  return buffer.toString("utf-8").trim()
}
