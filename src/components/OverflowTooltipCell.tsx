import React, { useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface OverflowTooltipCellProps {
  text: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * 单元格内容超出列宽时自动用省略号(...)截断；
 * 当且仅当内容超出列宽被截断时，鼠标悬浮展示完整信息浮层。
 */
export function OverflowTooltipCell({ text, className, children }: OverflowTooltipCellProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = () => {
    const el = textRef.current;
    if (!el || !text || text === '-') return;
    // 判断实际内容宽度是否超出当前列宽（即出现了省略号）
    if (el.scrollWidth > el.clientWidth) {
      const rect = el.getBoundingClientRect();
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
  };

  const handleMouseLeave = () => {
    if (tooltipPos) {
      setTooltipPos(null);
    }
  };

  return (
    <>
      <div
        ref={textRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn('w-full overflow-hidden text-ellipsis whitespace-nowrap', className)}
      >
        {children ?? text}
      </div>

      {tooltipPos && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(window.innerWidth - 20, Math.max(20, tooltipPos.x)),
            top: Math.max(12, tooltipPos.y - 8),
            transform: 'translate(-50%, -100%)',
            zIndex: 9999
          }}
          className="pointer-events-none max-w-[460px] px-3 py-2 rounded-lg bg-slate-900/95 text-white text-[12px] leading-relaxed shadow-xl border border-slate-700/80 break-words whitespace-normal text-left font-normal"
        >
          {text}
          <div className="w-2 h-2 bg-slate-900/95 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1 border-r border-b border-slate-700/80" />
        </div>
      )}
    </>
  );
}

interface ResizableThProps {
  key?: React.Key;
  colKey: string;
  width: number;
  minWidth?: number;
  onStartResize: (e: React.MouseEvent, colKey: string, minWidth?: number) => void;
  className?: string;
  children: React.ReactNode;
  hideResizer?: boolean;
  styleLeft?: number;
  styleRight?: number;
}

/**
 * 支持拖拽调整列宽的表头单元格，右侧带浅色竖线分隔符（与参考图一致）
 */
export function ResizableTh({
  colKey,
  width,
  minWidth = 70,
  onStartResize,
  className,
  children,
  hideResizer = false,
  styleLeft,
  styleRight
}: ResizableThProps) {
  return (
    <th
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        ...(styleLeft !== undefined ? { left: styleLeft } : {}),
        ...(styleRight !== undefined ? { right: styleRight } : {})
      }}
      className={cn('relative px-3 select-none group/th', className)}
    >
      <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </div>
      {!hideResizer && (
        <div
          onMouseDown={e => onStartResize(e, colKey, minWidth)}
          onClick={e => e.stopPropagation()}
          title="拖拽调整列宽"
          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-end pr-[1px] z-20 group/resizer"
        >
          <span className="w-[1.5px] h-4 bg-slate-300/90 group-hover/resizer:bg-blue-500 group-hover/resizer:h-full transition-all rounded-full" />
        </div>
      )}
    </th>
  );
}
