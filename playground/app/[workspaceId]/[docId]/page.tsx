import Link from "next/link";
import { PageRenderer } from "../../../components";

export default async function WorkspacePages({
  params,
}: {
  params: { workspaceId: string; docId: string };
}) {
  return (
    <main>
      <Link href={"/" + params.workspaceId}>
        <h3>back home</h3>
      </Link>
      <PageRenderer workspaceId={params.workspaceId} id={params.docId} />
    </main>
  );
}

export const revalidate = 60;
