import React from "react";
import { ErrorState } from "./ErrorState";
import { reportLovableError } from "@/lib/lovable-error-reporting";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
    reportLovableError(error, { boundary: "global_app_error_boundary" });
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  goHome = () => {
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Something went wrong"
          description="Please try refreshing the page. Your saved study data is still safe."
          onRetry={this.retry}
          onHome={this.goHome}
        />
      );
    }

    return this.props.children;
  }
}