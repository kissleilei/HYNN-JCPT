import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badgeText?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  placement?: 'bottom' | 'top';
  size?: 'sm' | 'md';
  className?: string;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择...',
  searchable = false,
  searchPlaceholder = '输入关键字检索...',
  placement = 'bottom',
  size = 'md',
  className = '',
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUp: boolean;
  }>({ top: 0, left: 0, width: 220, openUp: placement === 'top' });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp =
      placement === 'top'
        ? spaceAbove > 180 || spaceAbove > spaceBelow
        : spaceBelow < 240 && spaceAbove > spaceBelow;

    setCoords({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: Math.min(rect.left, Math.max(8, window.innerWidth - Math.max(rect.width, 220) - 8)),
      width: Math.max(rect.width, 200),
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, placement]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleReposition = () => {
      if (open) updatePosition();
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 20);
      }
    } else {
      setQuery('');
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, searchable]);

  const filteredOptions = searchable
    ? options.filter((o) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          o.label.toLowerCase().includes(q) ||
          (o.description && o.description.toLowerCase().includes(q)) ||
          (o.badgeText && o.badgeText.toLowerCase().includes(q))
        );
      })
    : options;

  const sizeClasses =
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full bg-white border rounded-lg flex items-center justify-between gap-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${sizeClasses} ${
          open
            ? 'border-blue-600 ring-2 ring-blue-600/15'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          <span
            className={
              selectedOption
                ? 'text-slate-900 font-medium truncate'
                : 'text-slate-400 truncate'
            }
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badgeText && (
            <span className="text-[11px] text-slate-500 font-mono-tabular shrink-0">
              {selectedOption.badgeText}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-blue-700' : ''
          }`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            transform: coords.openUp ? 'translateY(-100%)' : 'none',
          }}
          className="z-[100] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
        >
          {searchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                无匹配选项
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-start justify-between gap-2 transition-colors ${
                      opt.disabled
                        ? 'opacity-45 cursor-not-allowed'
                        : isSelected
                        ? 'bg-blue-50/80 text-blue-950'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs truncate ${
                            isSelected ? 'font-semibold text-blue-900' : 'font-medium'
                          }`}
                        >
                          {opt.label}
                        </span>
                        {opt.badgeText && (
                          <span className="text-[11px] font-mono-tabular text-slate-500 shrink-0">
                            {opt.badgeText}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {opt.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
