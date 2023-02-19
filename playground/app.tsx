import { getBlocksuiteReader } from "blocksuite-reader";
import React from "react";

import "./app.css";
import { WorkspacePage } from "./main";

const defaultWorkspaceId = "mWn__KSlOgS1tdDEjdX6P";

const useWorkspacePages = (workspaceId: string) => {
  const [pages, setPages] = React.useState<WorkspacePage[]>();

  React.useEffect(() => {
    let canceled = false;
    const reader = getBlocksuiteReader({
      target: location.origin,
      workspaceId,
    });

    reader.getWorkspacePages(true).then((pages) => {
      if (canceled) {
        return;
      }
      setPages(pages);
    });

    return () => {
      canceled = true;
    };
  }, [workspaceId]);

  return pages;
};

function App() {
  const pages = useWorkspacePages(
    location.pathname.replaceAll("/", "") || defaultWorkspaceId
  );
  return (
    <div className="app">
      {pages
        ? pages.map((page) => (
            <div key={page.id}>
              <h1>{page.title}</h1>
              <article>
                <pre>{page.md}</pre>
              </article>
            </div>
          ))
        : "Loading..."}
    </div>
  );
}

export { App };
