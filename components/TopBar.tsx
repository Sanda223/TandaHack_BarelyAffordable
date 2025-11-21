import React from 'react';
import { Page } from '../types';
import Icon from './Icon';
import logo from '../assets/logo.png';

interface TopBarProps {
  setActivePage: (page: Page) => void;
}

const TopBar: React.FC<TopBarProps> = ({ setActivePage }) => (
  <div className="fixed inset-x-0 top-0 z-20 bg-background/90 backdrop-blur px-4 md:px-6">
    <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-2">
      <div className="flex items-center gap-2 pl-2 -mt-4 -mb-6">
        <img src={logo} alt="Days-to" className="h-28 w-28 object-contain" />
      </div>
      <div className="pr-2">
        <button
          onClick={() => setActivePage(Page.Profile)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-card-bg text-text-primary shadow-subtle transition hover:border-primary/60 hover:text-primary"
          aria-label="Open profile"
        >
          <Icon name="user" className="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
);

export default TopBar;
