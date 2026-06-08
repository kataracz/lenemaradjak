import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, renderHook, screen, cleanup } from "@testing-library/react";
import { useVideoPlayer } from "@/contexts/useVideoPlayer";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";

afterEach(cleanup);

describe("useVideoPlayer", () => {
  it("throws when used outside VideoPlayerProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const TestComponent = () => {
      useVideoPlayer();
      return null;
    };
    expect(() => render(<TestComponent />)).toThrow(
      "useVideoPlayer must be used within VideoPlayerProvider",
    );
    spy.mockRestore();
  });

  it("returns context value when inside VideoPlayerProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VideoPlayerProvider>{children}</VideoPlayerProvider>
    );
    const { result } = renderHook(() => useVideoPlayer(), { wrapper });
    expect(result.current.currentVideo).toBeNull();
    expect(typeof result.current.setCurrentVideo).toBe("function");
  });
});

describe("VideoPlayerProvider", () => {
  it("renders its children", () => {
    render(
      <VideoPlayerProvider>
        <span>child content</span>
      </VideoPlayerProvider>,
    );
    expect(screen.getByText("child content")).toBeTruthy();
  });
});
