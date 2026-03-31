interface HeaderProps {
  title: string | React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
}

const Header = ({ title, subtitle, actions }: HeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {actions}
        </div>
      </div>
    </div>
  );
};

export default Header;
