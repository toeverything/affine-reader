import Link from "next/link";
import { PageRenderer } from "../../components";
import { reader } from "@/reader";

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
      <Link href={`/${params.docId}/edit`}>
        <h3>edit</h3>
      </Link>
      {page && pages && <PageRenderer page={page} pages={pages} />}
    </main>
  );
}

export const revalidate = 60;
