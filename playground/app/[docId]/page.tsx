"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const DocPreviewEditor = dynamic(
  () =>
    import("@/components/doc-editor/doc-editor").then(
      (mod) => mod.DocPreviewEditor
    ),
  {
    ssr: false,
  }
);

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

      <Link href={`/${params.docId}`}>
        <h3>exit editor</h3>
      </Link>

      <DocPreviewEditor docId={params.docId} />
    </main>
  );
}
