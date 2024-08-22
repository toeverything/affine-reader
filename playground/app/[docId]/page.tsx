import Link from "next/link";
import { PageRenderer } from "../../components";
import { blogReader } from "@/reader";

export default async function WorkspacePages({
  params,
}: {
  params: { docId: string };
}) {
  const pages = await blogReader.getDocPageMetas();
  const page = await blogReader.getWorkspacePageContent(params.docId);
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
