import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex-1 py-20" role="alert">
          <div className="max-w-xl mx-auto px-6 text-center">
            <h1 className="text-4xl font-serif-display">Something went wrong</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="mt-8 flex gap-3 justify-center">
              <button onClick={() => this.setState({ error: null })} className="btn-secondary">
                Try again
              </button>
              <Link to="/" className="btn-primary">
                Return home
              </Link>
            </div>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
