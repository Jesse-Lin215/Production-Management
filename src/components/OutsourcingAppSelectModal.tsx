import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  Check,
  Maximize2,
  Minimize2,
  Filter,
  SlidersHorizontal,
  Move,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  OutsourcingApplicationItem,
  getOutsourcingApplications,
  formatApplicationSalesOrders,
  formatApplicationMaterialsInfo
} from '../outsourcingStore';
import { OverflowTooltipCell, ResizableTh } from './OverflowTooltipCell';

interface AppModalColConfig {
  key: string;
  label: string;
  type: 'search' | 'filter' | 'date';
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  defaultWidth: number;
  minWidth: number;
  visible: boolean;
  pinned?: 'left' | 'right' | null;
}

const DEFAULT_APP_MODAL_COLS: AppModalColConfig[] = [
  { key: 'seq', label: '序号', type: 'search', sortable: false, defaultWidth: 68, minWidth: 56, visible: true },
  { key: 'applicationNo', label: '申请单编号', type: 'search', sortable: true, defaultWidth: 175, minWidth: 130, visible: true },
  { key: 'salesOrder', label: '销售订单', type: 'search', sortable: true, defaultWidth: 220, minWidth: 120, visible: true },
  { key: 'materialInfo', label: '物料信息', type: 'search', sortable: true, defaultWidth: 220, minWidth: 120, visible: true },
  { key: 'applyDate', label: '申请日期', type: 'date', sortable: true, defaultWidth: 120, minWidth: 95, visible: true },
  { key: 'totalQty', label: '总数量', type: 'search', sortable: true, defaultWidth: 95, minWidth: 80, visible: true },
  { key: 'convertedQty', label: '已转外协数量', type: 'search', sortable: true, defaultWidth: 120, minWidth: 100, visible: true },
  { key: 'requiredDate', label: '需求日期', type: 'date', sortable: true, defaultWidth: 120, minWidth: 95, visible: true },
  { key: 'remark', label: '备注', type: 'search', sortable: false, defaultWidth: 210, minWidth: 100, visible: true },
  { key: 'companyName', label: '所属公司', type: 'filter', sortable: false, defaultWidth: 150, minWidth: 110, visible: true },
  { key: 'status', label: '状态', type: 'filter', sortable: true, defaultWidth: 100, minWidth: 84, visible: true },
];

function SortTriangles({ activeDir }: { activeDir: 'asc' | 'desc' | null }) {
  return (
    <span className="inline-flex flex-col -space-y-1 ml-0.5 shrink-0">
      <svg
        viewBox="0 0 8 5"
        className={cn(
          'w-2 h-1.5 transition-colors',
          activeDir === 'asc' ? 'text-blue-600' : 'text-slate-300'
        )}
      >
        <path d="M4 0L8 5H0L4 0Z" fill="currentColor" />
      </svg>
      <svg
        viewBox="0 0 8 5"
        className={cn(
          'w-2 h-1.5 transition-colors',
          activeDir === 'desc' ? 'text-blue-600' : 'text-slate-300'
        )}
      >
        <path d="M4 5L0 0H8L4 5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

interface OutsourcingAppSelectModalProps {
  open: boolean;
  selectedApplicationNo?: string;
  onClose: () => void;
  onConfirm: (selectedApp: OutsourcingApplicationItem) => void;
}

export default function OutsourcingAppSelectModal({
  open,
  selectedApplicationNo,
  onClose,
  onConfirm,
}: OutsourcingAppSelectModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppNo, setSelectedAppNo] = useState<string>(selectedApplicationNo || '');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [cols, setCols] = useState<AppModalColConfig[]>(() =>
    DEFAULT_APP_MODAL_COLS.map(c => ({ ...c }))
  );
  const [isColConfigOpen, setIsColConfigOpen] = useState(false);
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    DEFAULT_APP_MODAL_COLS.forEach(c => {
      initial[c.key] = c.defaultWidth;
    });
    return initial;
  });

  const applications = useMemo(() => {
    if (!open) return [];
    return getOutsourcingApplications();
  }, [open]);

  useEffect(() => {
    if (open) {
      setSelectedAppNo(selectedApplicationNo || '');
      setSearchQuery('');
      setColFilters({});
      setActiveHeaderMenu(null);
      setIsColConfigOpen(false);
    }
  }, [open, selectedApplicationNo]);

  const getFieldValue = (item: OutsourcingApplicationItem, idx: number, colKey: string): string => {
    switch (colKey) {
      case 'seq':
        return String(idx + 1);
      case 'applicationNo':
        return item.applicationNo || '';
      case 'salesOrder':
        return formatApplicationSalesOrders(item);
      case 'materialInfo':
        return formatApplicationMaterialsInfo(item);
      case 'applyDate':
        return item.applyDate || '';
      case 'totalQty':
        return String(item.totalQty ?? 0);
      case 'convertedQty':
        return String(item.convertedQty ?? 0);
      case 'requiredDate':
        return item.requiredDate || '';
      case 'remark':
        return item.remark || '';
      case 'companyName':
        return item.companyName || '';
      case 'status':
        return item.status || '';
      default:
        return '';
    }
  };

  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = applications.filter((item, idx) => {
      if (q) {
        const appNoMatch = item.applicationNo.toLowerCase().includes(q);
        const soMatch = formatApplicationSalesOrders(item).toLowerCase().includes(q);
        const matMatch = formatApplicationMaterialsInfo(item).toLowerCase().includes(q);
        const remarkMatch = (item.remark || '').toLowerCase().includes(q);
        const companyMatch = (item.companyName || '').toLowerCase().includes(q);
        if (!appNoMatch && !soMatch && !matMatch && !remarkMatch && !companyMatch) {
          return false;
        }
      }

      for (const [colKey, filterVal] of Object.entries(colFilters)) {
        const trimmed = String(filterVal || '').trim().toLowerCase();
        if (!trimmed) continue;
        const cellVal = getFieldValue(item, idx, colKey).toLowerCase();
        if (!cellVal.includes(trimmed)) return false;
      }

      return true;
    });

    if (!sortConfig) return filtered;
    const { key, dir } = sortConfig;
    const numericKeys = new Set(['totalQty', 'convertedQty']);

    return [...filtered].sort((a, b) => {
      const valA = getFieldValue(a, 0, key);
      const valB = getFieldValue(b, 0, key);
      if (numericKeys.has(key)) {
        const numA = parseFloat(valA) || 0;
        const numB = parseFloat(valB) || 0;
        return dir === 'asc' ? numA - numB : numB - numA;
      }
      return dir === 'asc' ? valA.localeCompare(valB, 'zh-CN') : valB.localeCompare(valA, 'zh-CN');
    });
  }, [applications, searchQuery, colFilters, sortConfig]);

  if (!open) return null;

  const visibleCols = cols.filter(c => c.visible);

  const handleStartResize = (e: React.MouseEvent, colKey: string, minWidth = 70) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] ?? 120;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColWidths(prev => ({
        ...prev,
        [colKey]: Math.max(minWidth, startWidth + deltaX),
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleColVisible = (key: string) => {
    setCols(prev => prev.map(c => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  const handleSelectAllCols = () => {
    setCols(prev => prev.map(c => ({ ...c, visible: true })));
  };

  const handleClearAllCols = () => {
    setCols(prev => prev.map(c => ({ ...c, visible: false })));
  };

  const handleResetCols = () => {
    setCols(DEFAULT_APP_MODAL_COLS.map(c => ({ ...c })));
  };

  const moveColOrder = (idx: number, direction: 'up' | 'down') => {
    setCols(prev => {
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const toggleColPin = (idx: number, side: 'left' | 'right') => {
    setCols(prev => {
      const next = [...prev];
      const current = next[idx];
      const nextPinned = current.pinned === side ? null : side;
      const updated = { ...current, pinned: nextPinned };
      next.splice(idx, 1);
      if (nextPinned === 'left') {
        next.unshift(updated);
      } else if (nextPinned === 'right') {
        next.push(updated);
      } else {
        next.splice(idx, 0, updated);
      }
      return next;
    });
  };

  const handleDropCol = (targetIdx: number) => {
    if (draggedColIdx === null || draggedColIdx === targetIdx) {
      setDraggedColIdx(null);
      return;
    }
    setCols(prev => {
      const next = [...prev];
      const [moved] = next.splice(draggedColIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDraggedColIdx(null);
  };

  const handleConfirm = () => {
    const found = applications.find(a => a.applicationNo === selectedAppNo);
    if (found) {
      onConfirm(found);
    } else if (displayedItems.length > 0 && !selectedAppNo) {
      onConfirm(displayedItems[0]);
    }
    onClose();
  };

  const renderFilterableTh = (col: AppModalColConfig, idx: number) => {
    const colKey = col.key;
    const width = colWidths[colKey] ?? col.defaultWidth;
    const currentVal = colFilters[colKey] || '';
    const isActive = Boolean(currentVal.trim());
    const isMenuOpen = activeHeaderMenu === colKey;
    const isSorted = sortConfig?.key === colKey ? sortConfig.dir : null;

    const uniqueOptions =
      col.type === 'filter'
        ? Array.from(new Set(applications.map((a, i) => getFieldValue(a, i, colKey)).filter(Boolean)))
        : [];

    return (
      <ResizableTh
        key={colKey}
        colKey={colKey}
        width={width}
        minWidth={col.minWidth}
        onStartResize={handleStartResize}
        hideResizer={idx === visibleCols.length - 1}
        className={cn(
          'px-3 border-r border-slate-200/60 font-bold text-slate-700 relative select-none',
          col.align === 'right' && 'text-right',
          col.align === 'center' && 'text-center'
        )}
      >
        <div
          onClick={e => e.stopPropagation()}
          className={cn(
            'inline-flex items-center gap-1.5',
            colKey !== 'seq' && 'cursor-pointer group',
            col.align === 'right' && 'justify-end',
            col.align === 'center' && 'justify-center'
          )}
        >
          {colKey === 'seq' ? (
            <span className="text-[12px] font-bold text-slate-700">{col.label}</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveHeaderMenu(prev => (prev === colKey ? null : colKey));
                setIsColConfigOpen(false);
              }}
              className="inline-flex items-center gap-1 cursor-pointer"
            >
              {col.type === 'filter' ? (
                <Filter
                  className={cn(
                    'w-3 h-3 transition-colors shrink-0',
                    isActive || isMenuOpen ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
              ) : col.type === 'date' ? (
                <Calendar
                  className={cn(
                    'w-3 h-3 transition-colors shrink-0',
                    isActive || isMenuOpen ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
              ) : (
                <Search
                  className={cn(
                    'w-3 h-3 transition-colors shrink-0',
                    isActive || isMenuOpen ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
              )}
              <span className={cn('text-[12px] font-bold', isActive ? 'text-blue-600' : 'text-slate-700')}>
                {col.label}
              </span>
            </button>
          )}

          {col.sortable && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setSortConfig(prev => {
                  if (prev?.key === colKey) {
                    if (prev.dir === 'asc') return { key: colKey, dir: 'desc' };
                    return null;
                  }
                  return { key: colKey, dir: 'asc' };
                });
              }}
              className="cursor-pointer p-0.5 hover:bg-slate-200/60 rounded"
              title="点击排序"
            >
              <SortTriangles activeDir={isSorted} />
            </button>
          )}
        </div>

        {isMenuOpen && colKey !== 'seq' && (
          <div
            onClick={e => e.stopPropagation()}
            className="absolute left-2 top-full mt-1 z-30 w-[200px] bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 text-left font-normal"
          >
            {col.type !== 'filter' ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={currentVal}
                    onChange={e => setColFilters(prev => ({ ...prev, [colKey]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setActiveHeaderMenu(null);
                    }}
                    placeholder={`搜索${col.label}...`}
                    className="w-full h-[30px] pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setColFilters(prev => ({ ...prev, [colKey]: '' }));
                      setActiveHeaderMenu(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    重置
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHeaderMenu(null)}
                    className="h-[24px] px-2.5 rounded bg-blue-600 text-white text-[11px] font-medium cursor-pointer"
                  >
                    确定
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setColFilters(prev => ({ ...prev, [colKey]: '' }));
                    setActiveHeaderMenu(null);
                  }}
                  className={cn(
                    'w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] flex items-center justify-between cursor-pointer',
                    !currentVal ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span>全部</span>
                  {!currentVal && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <div className="max-h-[180px] overflow-y-auto space-y-0.5 custom-scrollbar">
                  {uniqueOptions.map(opt => {
                    const selected = currentVal === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setColFilters(prev => ({ ...prev, [colKey]: opt }));
                          setActiveHeaderMenu(null);
                        }}
                        className={cn(
                          'w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] flex items-center justify-between cursor-pointer',
                          selected ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        <span className="truncate">{opt}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </ResizableTh>
    );
  };

  const renderCell = (item: OutsourcingApplicationItem, rowIdx: number, col: AppModalColConfig) => {
    const colKey = col.key;
    const width = colWidths[colKey] ?? col.defaultWidth;
    const style = { width, minWidth: width, maxWidth: width };
    const isChecked = selectedAppNo === item.applicationNo;

    switch (colKey) {
      case 'seq':
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60">
            <div className="inline-flex items-center gap-2">
              <div
                className={cn(
                  'w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0',
                  isChecked ? 'bg-[#2563eb] text-white' : 'border border-slate-300 bg-white'
                )}
              >
                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
              <span className="text-slate-600">{rowIdx + 1}</span>
            </div>
          </td>
        );
      case 'applicationNo':
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60 text-blue-600 font-medium">
            <OverflowTooltipCell text={item.applicationNo} />
          </td>
        );
      case 'salesOrder': {
        const soText = formatApplicationSalesOrders(item);
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60 text-slate-800 font-medium">
            <OverflowTooltipCell text={soText} />
          </td>
        );
      }
      case 'materialInfo': {
        const matText = formatApplicationMaterialsInfo(item);
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60 text-slate-800">
            <OverflowTooltipCell text={matText} />
          </td>
        );
      }
      case 'applyDate':
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60 text-slate-700">
            <OverflowTooltipCell text={item.applyDate} />
          </td>
        );
      case 'totalQty':
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60 text-slate-800">
            <OverflowTooltipCell text={String(item.totalQty)} />
          </td>
        );
      case 'convertedQty':
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60 text-slate-700">
            <OverflowTooltipCell text={String(item.convertedQty)} />
          </td>
        );
      case 'requiredDate':
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60 text-slate-700">
            <OverflowTooltipCell text={item.requiredDate} />
          </td>
        );
      case 'remark':
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60 text-slate-500">
            <OverflowTooltipCell text={item.remark} />
          </td>
        );
      case 'companyName':
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60 text-slate-700">
            <OverflowTooltipCell text={item.companyName} />
          </td>
        );
      case 'status':
        return (
          <td key={colKey} style={style} className="px-3 border-r border-slate-200/60">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium',
                item.status === '进行中'
                  ? 'bg-blue-50 text-blue-600'
                  : item.status === '待审核'
                  ? 'bg-amber-50 text-amber-600'
                  : item.status === '审批驳回'
                  ? 'bg-red-50 text-red-600'
                  : item.status === '已完成'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {item.status}
            </span>
          </td>
        );
      default:
        return null;
    }
  };

  const totalTableWidth = visibleCols.reduce(
    (sum, col) => sum + (colWidths[col.key] ?? col.defaultWidth),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={e => {
          e.stopPropagation();
          setActiveHeaderMenu(null);
          setIsColConfigOpen(false);
        }}
        className={cn(
          'bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-200',
          isFullscreen
            ? 'w-[98vw] h-[94vh]'
            : 'w-[1440px] max-w-[96vw] h-[680px] max-h-[90vh]'
        )}
      >
        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">
              选择外协申请单
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[12px] font-medium">
              {selectedAppNo ? `已选：${selectedAppNo}` : `共 ${displayedItems.length} 条`}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              title={isFullscreen ? '还原窗口' : '最大化窗口'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              title="关闭"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 px-6 pb-2 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
            <div className="relative w-[360px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索申请单编号、销售订单、物料信息、备注..."
                className="w-full h-[36px] pl-9 pr-8 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {Object.values(colFilters).some(v => String(v || '').trim() !== '') && (
                <button
                  type="button"
                  onClick={() => setColFilters({})}
                  className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  清空列筛选
                </button>
              )}

              {/* 字段配置按钮与弹窗 */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveHeaderMenu(null);
                    setIsColConfigOpen(prev => !prev);
                  }}
                  title="字段配置"
                  className={cn(
                    'w-[34px] h-[34px] rounded-lg border flex items-center justify-center transition-colors cursor-pointer',
                    isColConfigOpen
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-slate-600 hover:text-blue-600'
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4 rotate-90" />
                </button>

                {isColConfigOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 text-[13px] select-none overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[14px]">显示字段</span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={handleSelectAllCols}
                          className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          全选
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllCols}
                          className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          清空
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto px-3 py-1.5 divide-y divide-slate-100 custom-scrollbar">
                      {cols.map((col, idx) => (
                        <div
                          key={col.key}
                          draggable
                          onDragStart={() => setDraggedColIdx(idx)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => handleDropCol(idx)}
                          className={cn(
                            'flex items-center justify-between py-2.5 px-1.5 rounded-lg hover:bg-slate-50/80 transition-colors',
                            draggedColIdx === idx && 'opacity-50 bg-blue-50/40'
                          )}
                        >
                          <div
                            onClick={() => toggleColVisible(col.key)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          >
                            <span
                              className={cn(
                                'w-4.5 h-4.5 rounded-full flex items-center justify-center border transition-colors shrink-0',
                                col.visible
                                  ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                                  : 'border-slate-300 bg-white'
                              )}
                            >
                              {col.visible && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </span>
                            <span
                              className={cn(
                                'text-[13px] truncate',
                                col.visible ? 'text-[#2563eb] font-medium' : 'text-slate-600'
                              )}
                            >
                              {col.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveColOrder(idx, 'up')}
                              title="向前移动"
                              className={cn(
                                'w-6 h-5 rounded border text-[9px] flex items-center justify-center transition-colors',
                                idx === 0
                                  ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                  : 'border-slate-200 bg-white hover:border-blue-400 hover:text-blue-600 text-slate-500 cursor-pointer'
                              )}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === cols.length - 1}
                              onClick={() => moveColOrder(idx, 'down')}
                              title="向后移动"
                              className={cn(
                                'w-6 h-5 rounded border text-[9px] flex items-center justify-center transition-colors',
                                idx === cols.length - 1
                                  ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                  : 'border-slate-200 bg-white hover:border-blue-400 hover:text-blue-600 text-slate-500 cursor-pointer'
                              )}
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleColPin(idx, 'left')}
                              title="移至最左/左固定"
                              className={cn(
                                'w-6 h-5 rounded border text-[11px] font-medium flex items-center justify-center transition-colors cursor-pointer',
                                col.pinned === 'left'
                                  ? 'border-[#3b82f6] bg-[#3b82f6] text-white'
                                  : 'border-slate-200 bg-white hover:border-blue-400 hover:text-blue-600 text-slate-500'
                              )}
                            >
                              左
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleColPin(idx, 'right')}
                              title="移至最右/右固定"
                              className={cn(
                                'w-6 h-5 rounded border text-[11px] font-medium flex items-center justify-center transition-colors cursor-pointer',
                                col.pinned === 'right'
                                  ? 'border-[#3b82f6] bg-[#3b82f6] text-white'
                                  : 'border-slate-200 bg-white hover:border-blue-400 hover:text-blue-600 text-slate-500'
                              )}
                            >
                              右
                            </button>
                            <span
                              title="拖拽调整顺序"
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
                            >
                              <Move className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-white">
                      <button
                        type="button"
                        onClick={() => setIsColConfigOpen(false)}
                        className="h-[34px] px-4 rounded-lg bg-[#3b82f6] hover:bg-blue-600 text-white text-[13px] font-medium cursor-pointer transition-colors"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={handleResetCols}
                        className="h-[34px] px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium cursor-pointer transition-colors"
                      >
                        重置
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 border border-slate-200/80 rounded-lg overflow-auto custom-scrollbar bg-white">
            <table
              style={{ width: Math.max(totalTableWidth, 1000) }}
              className="w-full table-fixed border-collapse text-left text-[13px] whitespace-nowrap"
            >
              <thead className="sticky top-0 z-10">
                <tr className="h-[42px] bg-[#f8fafc] border-b border-slate-200/80 text-slate-800 font-bold">
                  {visibleCols.map((col, idx) => renderFilterableTh(col, idx))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-slate-800">
                {visibleCols.length === 0 ? (
                  <tr>
                    <td colSpan={1} className="h-[220px] text-center text-slate-400">
                      暂无显示字段，请在右上角「字段配置」中勾选需要展示的字段
                    </td>
                  </tr>
                ) : displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length} className="h-[220px] text-center text-slate-400">
                      未找到匹配的外协申请单
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item, rowIdx) => {
                    const isChecked = selectedAppNo === item.applicationNo;
                    return (
                      <tr
                        key={item.id}
                        onClick={() =>
                          setSelectedAppNo(prev =>
                            prev === item.applicationNo ? '' : item.applicationNo
                          )
                        }
                        onDoubleClick={() => {
                          onConfirm(item);
                          onClose();
                        }}
                        className={cn(
                          'h-[44px] cursor-pointer transition-colors',
                          isChecked ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50'
                        )}
                      >
                        {visibleCols.map(col => renderCell(item, rowIdx, col))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[13px] text-slate-700 font-medium transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!selectedAppNo}
            onClick={handleConfirm}
            className={cn(
              'h-[36px] px-5 rounded-lg text-[13px] font-medium transition-colors shadow-xs',
              selectedAppNo
                ? 'bg-[#2563eb] hover:bg-blue-600 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
