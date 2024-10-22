"use client";;
import { use } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";

const DocPreviewEditor = dynamic(
  () =>
    import("@/components/doc-editor/doc-editor").then(
      (mod) => ({
        default: mod.DocPreviewEditor
      })
    ),
  {
    ssr: false,
  }
);

export default function DocPreviewEditorPage(
  props: {
    params: Promise<{ docId: string }>;
  }
) {
  const params = use(props.params);
  return (
    <main>
      <Link href={"/"}>
        <h3>back home</h3>
      </Link>

      <Link href={"/template"}>
        <h3>back to template list</h3>
      </Link>

      <DocPreviewEditor docId={params.docId} template />
    </main>
  );
}
