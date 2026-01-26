import { useState } from 'react';

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
}

const Header = ({ title, actions }: HeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {title}
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {actions}
        </div>
      </div>
    </div>
  );
};

export default Header;