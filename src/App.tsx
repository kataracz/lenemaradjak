import * as React from "react";
import Page from "./app/dashboard/page";
import { publishers } from "@/lib/publisher-config";
import { fetchRSSFeed } from "@/lib/fetchers/rss";

function App() {
  React.useEffect(() => {
    // Warm the RSS cache before individual widgets request their feeds.
    if (document.hidden) return;

    const urls = new Set<string>();

    for (const p of publishers) {
      if (p.articleFeedUrl) urls.add(p.articleFeedUrl);
      if (p.podcastFeedUrl) urls.add(p.podcastFeedUrl);
    }

    void (async () => {
      try {
        await Promise.allSettled(Array.from(urls).map((u) => fetchRSSFeed(u)));
      } catch (error) {
        if (import.meta.env.DEV) console.warn(error);
      }
    })();
  }, []);

  return <Page></Page>;
}

export default App;
