import React from 'react';
import { Page } from '../types';
import Icon from './Icon';
import TopBar from './TopBar';

interface LayoutProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  children: React.ReactNode;
  showNav?: boolean;
  hideTopBar?: boolean;
}

const navItems: { page: Page; label: string; icon: React.ComponentProps<typeof Icon>['name'] }[] = [
  { page: Page.Dashboard, label: 'Dashboard', icon: 'home' },
  { page: Page.Insights, label: 'Insights', icon: 'sparkles' },
  { page: Page.Learning, label: 'Learn', icon: 'book' },
  { page: Page.Simulator, label: 'What-If', icon: 'slider' },
  { page: Page.FinancialReport, label: 'Report', icon: 'chart-bar' },
];

const Layout: React.FC<LayoutProps> = ({ activePage, setActivePage, children, showNav = true, hideTopBar = false }) => {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      {showNav && !hideTopBar && (
        <TopBar setActivePage={setActivePage} />
      )}
      {/* Main Content */}
      <main className={showNav ? (!hideTopBar ? 'pb-24 pt-10' : 'pb-24 pt-2') : ''}>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card-bg/80 backdrop-blur-lg border-t border-gray-200/80 shadow-t-lg">
          <div className="flex justify-around max-w-lg mx-auto p-2">
              {navItems.map(item => {
                  const isActive = activePage === item.page;
                  return (
                      <button
                        key={item.page}
                        onClick={() => setActivePage(item.page)}
                        className={`flex flex-col items-center justify-center w-full p-2 rounded-lg text-xs font-medium transition-colors duration-200 ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-primary'}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon name={item.icon} className="w-6 h-6 mb-1" />
                        <span>{item.label}</span>
                      </button>
                  )
              })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
