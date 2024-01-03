import { reader } from "@/reader";

export async function GET(
  _request: Request,
  { params }: { params: { blobId: string } }
) {
  const slug = params.blobId;
  const res = await reader.getBlob(slug);
  return res;
}
