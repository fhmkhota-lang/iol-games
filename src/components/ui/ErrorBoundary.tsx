import { Component, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props { children: ReactNode; onBack: () => void; }
interface State { error: Error | null; }

export class GameErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#111] text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
          <AlertTriangle size={40} className="text-yellow-400" />
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p className="text-gray-400 text-sm max-w-xs">{this.state.error.message}</p>
          <button
            onClick={this.props.onBack}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <ArrowLeft size={16} /> Back to games
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
