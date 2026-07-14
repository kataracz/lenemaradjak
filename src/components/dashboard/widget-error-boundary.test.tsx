import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { WidgetErrorBoundary } from "@/components/dashboard/widget-error-boundary";

function ThrowingWidget(): never {
  throw new Error("boom");
}

function WorkingWidget() {
  return <div data-testid="working-widget">content</div>;
}

describe("WidgetErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders children when they don't throw", () => {
    render(
      <WidgetErrorBoundary title="Widget">
        <WorkingWidget />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByTestId("working-widget")).toBeTruthy();
  });

  it("renders a fallback card instead of crashing when a widget throws", () => {
    render(
      <WidgetErrorBoundary title="Videók">
        <ThrowingWidget />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByText("Videók")).toBeTruthy();
    expect(screen.getByText("Ez a widget hibába ütközött.")).toBeTruthy();
  });

  it("only affects the widget that threw, not its siblings", () => {
    render(
      <>
        <WidgetErrorBoundary title="Broken">
          <ThrowingWidget />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Fine">
          <WorkingWidget />
        </WidgetErrorBoundary>
      </>,
    );
    expect(screen.getByText("Ez a widget hibába ütközött.")).toBeTruthy();
    expect(screen.getByTestId("working-widget")).toBeTruthy();
  });
});
