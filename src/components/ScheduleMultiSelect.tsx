import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, X, Check, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ReportingType } from '../types';

// Position -> Employees mapping (includes screenshot items & existing standard items)
export const POSITION_EMPLOYEE_MAP: Record<string, string[]> = {
  '激光下料操作工': ['唐鸿运', '王文源', '谢建文', '黄友建', '黄雄建', '谭志亮'],
  '折弯': ['吴达', '倪抗林'],
  '焊工': ['陈建国', '刘志强'],
  '打磨': ['柏胜章', '周强'],
  '钳工': ['王技师', '林建华'],
  '喷粉工': ['邓明', '贺勇'],
  '操作工': ['张师傅', '吴师傅'],
  '数控技师': ['李师傅'],
  '高级钳工': ['王技师'],
  '电气工程师': ['赵工'],
  '调试技师': ['孙师傅'],
  '线割技师': ['周技师'],
  'CAM工程师': ['钱工'],
  '质检员': ['郑质检'],
};

export const ALL_SCHEDULE_POSITIONS: string[] = [
  '激光下料操作工',
  '折弯',
  '焊工',
  '打磨',
  '钳工',
  '喷粉工',
  '操作工',
  '数控技师',
  '高级钳工',
  '电气工程师',
  '调试技师',
  '线割技师',
  'CAM工程师',
  '质检员',
];

// Ordered so the top matches the user's screenshot (王文源, 谢建文, 黄友建, 黄雄建, 谭志亮, 吴达, 倪抗林, 唐鸿运...)
export const ALL_SCHEDULE_EMPLOYEES: Array<{ name: string; position: string }> = [
  { name: '王文源', position: '激光下料操作工' },
  { name: '谢建文', position: '激光下料操作工' },
  { name: '黄友建', position: '激光下料操作工' },
  { name: '黄雄建', position: '激光下料操作工' },
  { name: '谭志亮', position: '激光下料操作工' },
  { name: '吴达', position: '折弯' },
  { name: '倪抗林', position: '折弯' },
  { name: '唐鸿运', position: '激光下料操作工' },
  { name: '陈建国', position: '焊工' },
  { name: '刘志强', position: '焊工' },
  { name: '柏胜章', position: '打磨' },
  { name: '周强', position: '打磨' },
  { name: '林建华', position: '钳工' },
  { name: '邓明', position: '喷粉工' },
  { name: '贺勇', position: '喷粉工' },
  { name: '张师傅', position: '操作工' },
  { name: '李师傅', position: '数控技师' },
  { name: '王技师', position: '高级钳工' },
  { name: '赵工', position: '电气工程师' },
  { name: '孙师傅', position: '调试技师' },
  { name: '周技师', position: '线割技师' },
  { name: '钱工', position: 'CAM工程师' },
  { name: '吴师傅', position: '操作工' },
  { name: '郑质检', position: '质检员' },
];

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayDateTimeStr(time = '08:00'): string {
  return `${getTodayDateStr()}T${time}`;
}

export function parseMultiValue(val?: string): string[] {
  if (!val) return [];
  return val
    .split(/[,，、]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function formatMultiValue(arr: string[]): string {
  return Array.from(new Set(arr.map(s => s.trim()).filter(Boolean))).join(',');
}

/**
 * When user manually changes positions:
 * Any newly selected position automatically brings its employees and adds them to the employee list.
 */
export function applyPositionSelectionChange(
  nextPositions: string[],
  prevPositions: string[],
  currentEmployees: string[]
): { position: string; employee: string } {
  const addedPositions = nextPositions.filter(p => !prevPositions.includes(p));
  const empSet = new Set(currentEmployees);

  addedPositions.forEach(pos => {
    const emps = POSITION_EMPLOYEE_MAP[pos] || [];
    emps.forEach(e => empSet.add(e));
  });

  return {
    position: formatMultiValue(nextPositions),
    employee: formatMultiValue(Array.from(empSet)),
  };
}

/**
 * When user changes employees:
 * Any selected employee automatically brings their position into the position field.
 */
export function applyEmployeeSelectionChange(
  nextEmployees: string[],
  prevEmployees: string[],
  currentPositions: string[]
): { position: string; employee: string } {
  const addedEmployees = nextEmployees.filter(e => !prevEmployees.includes(e));
  const posSet = new Set(currentPositions);

  // Ensure all added employees (or all currently selected employees if positions was empty) have their position added
  const targetEmployees = currentPositions.length === 0 ? nextEmployees : addedEmployees;
  targetEmployees.forEach(empName => {
    const found = ALL_SCHEDULE_EMPLOYEES.find(e => e.name === empName);
    if (found?.position) {
      posSet.add(found.position);
    } else {
      for (const [pos, empList] of Object.entries(POSITION_EMPLOYEE_MAP)) {
        if (empList.includes(empName)) {
          posSet.add(pos);
        }
      }
    }
  });

  return {
    position: formatMultiValue(Array.from(posSet)),
    employee: formatMultiValue(nextEmployees),
  };
}

interface ScheduleMultiSelectProps {
  value?: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (nextSelected: string[], prevSelected: string[]) => void;
  className?: string;
  widthClass?: string;
}

export const ScheduleMultiSelect: React.FC<ScheduleMultiSelectProps> = ({
  value,
  options,
  placeholder = '请选择',
  disabled = false,
  onChange,
  className,
  widthClass = 'w-[180px]',
}) => {
  const selected = parseMultiValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  }>({ top: 0, left: 0, width: 180, openUpward: false });

  // Merge any custom values already in `selected` so they appear in options
  const mergedOptions = React.useMemo(() => {
    const set = new Set(options);
    selected.forEach(s => set.add(s));
    return Array.from(set);
  }, [options, selected]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;
    setDropdownStyle({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 170),
      openUpward,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        !target.closest('.schedule-multiselect-portal')
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest?.('.schedule-multiselect-portal')) {
        return; // scrolling inside dropdown menu itself
      }
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleToggleOption = (opt: string) => {
    if (disabled) return;
    const exists = selected.includes(opt);
    const next = exists ? selected.filter(item => item !== opt) : [...selected, opt];
    onChange(next, selected);
  };

  const handleRemoveSingle = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    if (disabled) return;
    const next = selected.filter(item => item !== opt);
    onChange(next, selected);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange([], selected);
  };

  const firstItem = selected[0];
  const extraCount = selected.length > 1 ? selected.length - 1 : 0;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (!disabled) setIsOpen(prev => !prev);
        }}
        title={selected.length > 0 ? selected.join('、') : placeholder}
        className={cn(
          'relative min-h-[32px] px-2 py-1 rounded border bg-white flex items-center justify-between gap-1 text-xs transition-all select-none',
          widthClass,
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'border-[#1677ff] ring-2 ring-[#1677ff]/15 cursor-pointer'
            : 'border-slate-200 hover:border-blue-400 cursor-pointer',
          className
        )}
      >
        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
          {selected.length === 0 ? (
            <span className="text-slate-400 text-xs truncate pl-0.5">{placeholder}</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#f0f2f5] text-slate-700 border border-slate-200/80 rounded text-xs max-w-[104px] shrink-0">
                <span className="truncate leading-tight">{firstItem}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={e => handleRemoveSingle(e, firstItem)}
                    className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/70 p-0.2 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
              {extraCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 bg-[#f0f2f5] text-slate-600 border border-slate-200/80 rounded text-xs font-mono shrink-0 leading-tight">
                  + {extraCount}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center shrink-0 text-slate-400">
          {!disabled && isHovered && selected.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer p-0.5"
              title="清空已选"
            >
              <XCircle className="w-3.5 h-3.5 fill-slate-300 text-white hover:fill-slate-400" />
            </button>
          ) : isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownStyle.openUpward ? undefined : dropdownStyle.top,
              bottom: dropdownStyle.openUpward
                ? window.innerHeight - dropdownStyle.top
                : undefined,
              left: dropdownStyle.left,
              minWidth: dropdownStyle.width,
            }}
            className="schedule-multiselect-portal z-[9999] bg-white border border-slate-200 rounded-md shadow-xl py-1 max-h-[240px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
            onClick={e => e.stopPropagation()}
          >
            {mergedOptions.map(opt => {
              const isSelected = selected.includes(opt);
              return (
                <div
                  key={opt}
                  onClick={() => handleToggleOption(opt)}
                  className={cn(
                    'px-3 py-2 text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors',
                    isSelected
                      ? 'text-[#1677ff] font-bold bg-blue-50/30 hover:bg-blue-50/60'
                      : 'text-slate-700 font-normal hover:bg-slate-50'
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1677ff] shrink-0 stroke-[2.5]" />}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};

interface ReportingTypeSelectProps {
  value?: ReportingType | string;
  onChange: (value: ReportingType) => void;
  disabled?: boolean;
  className?: string;
}

export const ReportingTypeSelect: React.FC<ReportingTypeSelectProps> = ({
  value = 'PIECE',
  onChange,
  disabled = false,
  className,
}) => {
  const normalized: ReportingType =
    value === 'TIME' || value === '计时' || value === '计时报工' || value === '工时报工'
      ? 'TIME'
      : 'PIECE';

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  }>({ top: 0, left: 0, width: 110, openUpward: false });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 110 && rect.top > 110;
    setDropdownStyle({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 110),
      openUpward,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        !target.closest('.reporting-type-select-portal')
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const options: Array<{ label: string; value: ReportingType }> = [
    { label: '计件报工', value: 'PIECE' },
    { label: '计时报工', value: 'TIME' },
  ];

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => {
          if (!disabled) setIsOpen(prev => !prev);
        }}
        className={cn(
          'min-h-[32px] w-[110px] mx-auto px-2.5 py-1 rounded border bg-white flex items-center justify-between gap-1 text-xs transition-all select-none',
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'border-[#1677ff] ring-2 ring-[#1677ff]/15 cursor-pointer'
            : 'border-slate-200 hover:border-blue-400 cursor-pointer',
          className
        )}
      >
        <span className="text-slate-700 font-medium truncate">
          {normalized === 'TIME' ? '计时报工' : '计件报工'}
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
      </div>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownStyle.openUpward ? undefined : dropdownStyle.top,
              bottom: dropdownStyle.openUpward
                ? window.innerHeight - dropdownStyle.top
                : undefined,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
            }}
            className="reporting-type-select-portal z-[9999] bg-white border border-slate-200 rounded-md shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
            onClick={e => e.stopPropagation()}
          >
            {options.map(opt => {
              const isSelected = normalized === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors',
                    isSelected
                      ? 'text-[#1677ff] font-bold bg-blue-50/40'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1677ff] shrink-0" />}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
