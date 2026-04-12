'use client';

import React from 'react';
import Link from 'react-navigation';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useBreadcrumbs } from '@/components/layout/BreadcrumbContext';

interface BreadcrumbsProps {
  rootLabel: string;
}

export const Breadcrumbs = ({ rootLabel }: BreadcrumbsProps) => {
  const { breadcrumbs } = useBreadcrumbs();
  const pathname = usePathname();

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="flex items-center text-sm font-medium text-slate-500 ml-2 overflow-x-auto no-scrollbar whitespace-nowrap mask-fade-right max-w-[calc(100vw-120px)] lg:max-w-none"
    >
      <div className="flex items-center flex-shrink-0">
        <span className="flex-shrink-0">{rootLabel}</span>
        
        {breadcrumbs.length > 0 ? (
          breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-4 h-4 mx-1.5 sm:mx-2 text-slate-300 flex-shrink-0" />
              {crumb.href ? (
                <NextLink 
                  href={crumb.href} 
                  className="hover:text-indigo-600 transition-colors flex-shrink-0"
                >
                  {crumb.label}
                </NextLink>
              ) : (
                <span className={`flex-shrink-0 ${idx === breadcrumbs.length - 1 ? 'text-slate-900 font-bold' : ''}`}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))
        ) : pathname !== '/' ? (
          <>
            <ChevronRight className="w-4 h-4 mx-1.5 sm:mx-2 text-slate-300 flex-shrink-0" />
            <span className="text-slate-900 flex-shrink-0 font-bold">
              {/* Fallback to capitalized title from path */}
              {pathname?.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </>
        ) : null}
      </div>
    </nav>
  );
};
