import { useEffect, useRef } from 'react';
import { useBreadcrumbs, Breadcrumb } from '@/components/layout/BreadcrumbContext';

interface PageHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
}

const PageHeader = ({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) => {
  const { setBreadcrumbs, clearBreadcrumbs } = useBreadcrumbs();
  const didSetBreadcrumbsRef = useRef(false);

  useEffect(() => {
    if (breadcrumbs) {
      setBreadcrumbs(breadcrumbs);
      didSetBreadcrumbsRef.current = true;
    }
    return () => {
      if (didSetBreadcrumbsRef.current) {
        clearBreadcrumbs();
      }
    };
  }, [breadcrumbs, setBreadcrumbs, clearBreadcrumbs]);

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm font-medium text-slate-500 mt-1 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
