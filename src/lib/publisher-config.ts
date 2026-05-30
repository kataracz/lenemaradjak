import type { PublisherConfig } from "@/types/dashboard";

export const publishers: PublisherConfig[] = [
  {
    id: "telex",
    name: "Telex",
    articleFeedUrl: "https://telex.hu/rss/mstag/belfold",
    // Telex podcast
    podcastFeedUrl: "https://anchor.fm/s/dcfcc3bc/podcast/rss",
    youtubeChannelHandle: "@Telexponthu",
  },
  {
    id: "partizan",
    name: "Partiizán",
    // Partizán podcasts (direct)
    podcastFeedUrl: "https://media.rss.com/partizanpodcast/feed.xml",
    // Alternate Partizán podcast feed
    // podcastFeedUrlSecondary: "https://media.rss.com/partizan-podcast/feed.xml",
    youtubeChannelHandle: "@Partiz%C3%A1nm%C3%A9dia",
  },
  {
    id: "kontroll",
    name: "Kontroll",
    // No direct article/podcast RSS provided yet
    youtubeChannelHandle: "@kontrollhu",
  },
  {
    id: "magyarhang",
    name: "Magyar Hang",
    articleFeedUrl: "https://magyarhang.org/feed/",
    youtubeChannelHandle: "@magyarhang",
  },
  {
    id: "valasz",
    name: "Válasz Online",
    articleFeedUrl: "https://www.valaszonline.hu/feed/",
    youtubeChannelHandle: "@valaszonline",
  },
  {
    id: "direkt36",
    name: "Direkt36",
    articleFeedUrl: "https://www.direkt36.hu/feed/",
    youtubeChannelHandle: "@direkt3634",
  },
  {
    id: "24hu",
    name: "24.hu",
    // No direct article RSS provided yet
    youtubeChannelHandle: "@24ponthu",
  },
  {
    id: "444",
    name: "444",
    articleFeedUrl: "https://444.hu/feed/",
    podcastFeedUrl:
      "https://www.omnycontent.com/d/playlist/d8df8f59-7dc7-4c59-be78-aea00114ae64/5643256c-50ca-4b83-bd76-aead00d561e1/31d0efea-4591-440a-8088-aead00d561fd/podcast.rss",
    youtubeChannelHandle: "@negynegynegy",
  },
  {
    id: "magyarpeter",
    name: "Magyar Péter",
    youtubeChannelHandle: "@magyarpeterofficial",
  },
];

export const defaultPublisherIds = publishers.map((publisher) => publisher.id);
