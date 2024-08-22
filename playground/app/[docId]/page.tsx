import Link from "next/link";
import { PageRenderer } from "../../components";
import { blogReader } from "@/reader";

export default async function WorkspacePage({
  params,
}: {
  params: { docId: string };
}) {
  const page = await blogReader.getWorkspacePageContent(params.docId);
  return (
    <main>
      <Link href={"/"}>
        <h3>back home</h3>
      </Link>
      <Link href={`/${params.docId}/edit`}>
        <h3>edit</h3>
      </Link>
      {page && <PageRenderer page={page} />}
    </main>
  );
}

export const revalidate = 60;
