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
    name: "Partizán",
    // Partizán podcasts (direct)
    podcastFeedUrl: "https://media.rss.com/partizanpodcast/feed.xml",
    // Alternate Partizán podcast feed
    // podcastFeedUrlSecondary: "https://media.rss.com/partizan-podcast/feed.xml",
    youtubeChannelHandle: "@Partizánmédia",
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
    youtubeChannelHandle: "@24ponthu",
  },
  {
    id: "444",
    name: "444",
    articleFeedUrl: "https://444.hu/feed/",
    youtubeChannelHandle: "@negynegynegy",
  },
  {
    id: "magyarpeter",
    name: "Magyar Péter",
    youtubeChannelHandle: "@magyarpeterofficial",
  },
];

export const defaultPublisherIds = publishers.map((publisher) => publisher.id);
