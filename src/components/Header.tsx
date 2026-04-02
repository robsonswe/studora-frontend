interface HeaderProps {
  title: string | React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
}

const Header = ({ title, subtitle, actions }: HeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <h1 className="text-[1.75rem] font-bold tracking-tight leading-[1.2] text-slate-900 truncate">
            {title}
          </h1>
          {subtitle && (
            <span className="text-sm font-normal text-slate-500 mt-1.5">{subtitle}</span>
          )}
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 items-center gap-3">
          {actions}
        </div>
      </div>
    </div>
  );
};

export default Header;
