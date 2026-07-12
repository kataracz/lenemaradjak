import * as React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const mountSpy = vi.fn();
const unmountSpy = vi.fn();

function makeStubWidget(id: string) {
  return function StubWidget({ publisherIds }: { publisherIds: string[] }) {
    React.useEffect(() => {
      mountSpy(id, publisherIds);
      return () => {
        unmountSpy(id);
      };
    }, [publisherIds]);
    return <div data-testid={`widget-${id}`}>{id} content</div>;
  };
}

vi.mock("@/components/dashboard/widget-registry", () => {
  const widgets: Record<
    string,
    {
      id: string;
      title: string;
      component: React.ComponentType<{ publisherIds: string[] }>;
    }
  > = {
    liveStreams: {
      id: "liveStreams",
      title: "Élők",
      component: makeStubWidget("liveStreams"),
    },
    youtubeVideos: {
      id: "youtubeVideos",
      title: "Videók",
      component: makeStubWidget("youtubeVideos"),
    },
    podcasts: {
      id: "podcasts",
      title: "Podcastok",
      component: makeStubWidget("podcasts"),
    },
    articles: {
      id: "articles",
      title: "Cikkek",
      component: makeStubWidget("articles"),
    },
  };
  return {
    findWidgetDefinition: (id: string) => widgets[id],
  };
});

import { MobileDashboardTabs } from "@/components/dashboard/mobile-dashboard-tabs";

describe("MobileDashboardTabs", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a tab trigger for each widget with its title", () => {
    render(<MobileDashboardTabs publisherIds={["a"]} />);
    expect(screen.getByRole("tab", { name: "Élők" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Videók" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Podcastok" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Cikkek" })).toBeTruthy();
  });

  it("mounts only the first (Élők) tab's widget initially", () => {
    render(<MobileDashboardTabs publisherIds={["a"]} />);
    expect(screen.getByTestId("widget-liveStreams")).toBeTruthy();
    expect(screen.queryByTestId("widget-youtubeVideos")).toBeNull();
    expect(screen.queryByTestId("widget-podcasts")).toBeNull();
    expect(screen.queryByTestId("widget-articles")).toBeNull();
    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(mountSpy).toHaveBeenCalledWith("liveStreams", ["a"]);
  });

  it("mounts the clicked tab's widget and unmounts the previous one", () => {
    render(<MobileDashboardTabs publisherIds={["a"]} />);
    const podcastsTab = screen.getByRole("tab", { name: "Podcastok" });
    fireEvent.mouseDown(podcastsTab, { button: 0 });
    expect(screen.getByTestId("widget-podcasts")).toBeTruthy();
    expect(screen.queryByTestId("widget-liveStreams")).toBeNull();
    expect(unmountSpy).toHaveBeenCalledWith("liveStreams");
  });
});
