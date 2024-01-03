import Link from "next/link";
import { PageRenderer } from "../../components";

export default async function WorkspacePages({
  params,
}: {
  params: { docId: string };
}) {
  return (
    <main>
      <Link href={"/"}>
        <h3>back home</h3>
      </Link>
      <PageRenderer id={params.docId} />
    </main>
  );
}

export const revalidate = 60;
