import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || '页面初始化异常',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-base font-semibold text-slate-900">
              恒翼能奖惩治理平台 · 页面加载遇到异常
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              可能是浏览器本地缓存数据版本不一致导致（{this.state.errorMessage}）。点击下方按钮清理本地缓存后即可恢复正常显示。
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {
                  // ignore
                }
                window.location.reload();
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg"
            >
              清理缓存并重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
