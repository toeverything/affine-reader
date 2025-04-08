import { DocPreviewEditor } from "@/components/doc-editor/doc-editor";
import Link from "next/link";

export default function DocPreviewEditorPage({
  params,
}: {
  params: { docId: string };
}) {
  return (
    <main>
      <Link href={"/"}>
        <h3>back home</h3>
      </Link>

      <Link href={"/template"}>
        <h3>back to template list</h3>
      </Link>

      {/* @ts-expect-error Async Server Component */}
      <DocPreviewEditor docId={params.docId} template />
    </main>
  );
}
