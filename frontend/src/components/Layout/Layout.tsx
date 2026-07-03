import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isMeetingRoom = location.pathname.startsWith('/meeting/') && location.pathname !== '/meeting/new';

  if (isMeetingRoom) {
    return (
      <div className="flex h-screen bg-[--color-background] text-[--color-foreground] overflow-hidden">
        <main className="flex-1 overflow-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-[1520px] px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[--color-background] text-[--color-foreground] overflow-hidden">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-[1520px] px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

