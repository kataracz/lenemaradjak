import { Component, type ReactNode } from "react";
import { DashboardCard } from "@/components/dashboard/widget-card";

interface WidgetErrorBoundaryProps {
  title: string;
  bare?: boolean;
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  error: Error | null;
}

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (this.state.error) {
      return (
        <DashboardCard title={this.props.title} bare={this.props.bare}>
          <p className="px-4 text-sm text-muted-foreground">
            Ez a widget hibába ütközött.
          </p>
        </DashboardCard>
      );
    }
    return this.props.children;
  }
}
