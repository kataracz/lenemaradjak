import type { PublisherConfig } from "@/types/dashboard";

export const publishers: PublisherConfig[] = [
  {
    id: "telex",
    name: "Telex",
    articleFeedUrl: "https://telex.hu/rss/mstag/belfold",
    podcastFeedUrl: "https://anchor.fm/s/dcfcc3bc/podcast/rss",
    youtubeChannelHandle: "@Telexponthu",
    youtubeChannelId: "UCM-1sd-cXSuCsfWp8QMY_OQ",
  },
  {
    id: "partizan",
    name: "Partizán",
    podcastFeedUrl: "https://media.rss.com/partizanpodcast/feed.xml",
    youtubeChannelHandle: "@Partizánmédia",
    youtubeChannelId: "UCEFpEvuosfPGlV1VyUF6QOA",
  },
  {
    id: "kontroll",
    name: "Kontroll",
    youtubeChannelHandle: "@kontrollhu",
    youtubeChannelId: "UCW_zf7VdaFoeZqVTlYht4oA",
  },
  {
    id: "magyarhang",
    name: "Magyar Hang",
    articleFeedUrl: "https://magyarhang.org/feed/",
    youtubeChannelHandle: "@magyarhang",
    youtubeChannelId: "UCnlMwO6KqQQKn7byzHRbvlQ",
  },
  {
    id: "valasz",
    name: "Válasz Online",
    articleFeedUrl: "https://www.valaszonline.hu/feed/",
    youtubeChannelHandle: "@valaszonline",
    youtubeChannelId: "UCk4Xm32zEO4ymAxK1NJ5Tmw",
  },
  {
    id: "direkt36",
    name: "Direkt36",
    articleFeedUrl: "https://www.direkt36.hu/feed/",
    youtubeChannelHandle: "@direkt3634",
    youtubeChannelId: "UCgkd27yNbaq1L3miQ6-WSEg",
  },
  {
    id: "24hu",
    name: "24.hu",
    youtubeChannelHandle: "@24ponthu",
    youtubeChannelId: "UCw0oJgCjz3NvAICbqWImH-A",
  },
  {
    id: "444",
    name: "444",
    articleFeedUrl: "https://444.hu/feed/",
    youtubeChannelHandle: "@negynegynegy",
    youtubeChannelId: "UCGoLa-QhHmTxLEdjv_8dxrg",
  },
  {
    id: "magyarpeter",
    name: "Magyar Péter",
    youtubeChannelHandle: "@magyarpeterofficial",
    youtubeChannelId: "UCDHjSN4vbfmzb8Cdfsob9Gg",
  },
];

export const defaultPublisherIds = publishers.map((publisher) => publisher.id);
