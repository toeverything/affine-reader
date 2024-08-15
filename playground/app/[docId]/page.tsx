import Link from "next/link";
import { PageRenderer } from "../../components";
import { reader } from "@/reader";
import { use } from "react";

export default async function WorkspacePages({
  params,
}: {
  params: { docId: string };
}) {
  const pages = await reader.getDocPageMetas();
  const page = await reader.getDocMarkdown(params.docId);

  return (
    <main>
      <Link href={"/"}>
        <h3>back home</h3>
      </Link>
      {page && pages && <PageRenderer page={page} pages={pages} />}
    </main>
  );
}

export const revalidate = 60;
