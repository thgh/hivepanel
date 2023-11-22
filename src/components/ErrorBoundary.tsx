import React, { ErrorInfo } from 'react'

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = {}
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return <div>{this.state.error.message}</div>
    }

    return this.props.children
  }
}
