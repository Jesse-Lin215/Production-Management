import React, { useState, useRef } from 'react';
import { 
  Menu, Bell, Settings, Search, Maximize, Smartphone, Globe, ChevronDown,
  Layers, Users, HeartHandshake, ShoppingBag, Headphones, ShoppingCart, 
  Factory, Box, Coins, BarChart, MessageSquare, LayoutDashboard, GitBranch,
  ClipboardList, CheckSquare, FileText, BookOpen, Clock, Truck, CreditCard,
  Calculator, PieChart
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu?: 'orders' | 'tasks';
  onSelectMenu?: (menu: 'orders' | 'tasks') => void;
}

const SIDEBAR_ITEMS = [
  { 
    icon: Layers, 
    label: 'BOM管理', 
    key: 'bom',
    subItems: [
      { icon: Layers, label: 'BOM清单管理', key: 'bom-list' },
      { icon: GitBranch, label: '工艺路线设置', key: 'bom-route' },
    ]
  },
  { 
    icon: Users, 
    label: 'HRM人力', 
    key: 'hrm',
    subItems: [
      { icon: Users, label: '员工档案管理', key: 'hrm-staff' },
      { icon: CheckSquare, label: '考勤排班管理', key: 'hrm-shift' },
    ]
  },
  { 
    icon: HeartHandshake, 
    label: '客户关系', 
    key: 'crm',
    subItems: [
      { icon: HeartHandshake, label: '客户信息管理', key: 'crm-info' },
      { icon: MessageSquare, label: '跟进记录', key: 'crm-follow' },
    ]
  },
  { 
    icon: ShoppingBag, 
    label: '销售管理', 
    key: 'sales',
    subItems: [
      { icon: ShoppingBag, label: '销售订单管理', key: 'sales-order' },
      { icon: Coins, label: '销售报价管理', key: 'sales-quote' },
    ]
  },
  { 
    icon: Headphones, 
    label: '服务管理', 
    key: 'service',
    subItems: [
      { icon: Headphones, label: '售后工单管理', key: 'service-order' },
      { icon: MessageSquare, label: '客户反馈记录', key: 'service-feedback' },
    ]
  },
  { 
    icon: ShoppingCart, 
    label: '采购管理', 
    key: 'purchase',
    subItems: [
      { icon: FileText, label: '询价单管理', key: 'pur-inquiry' },
      { icon: BookOpen, label: '采购申请单', key: 'pur-apply' },
      { icon: ShoppingCart, label: '采购订单', key: 'pur-order' },
      { icon: Clock, label: '到货通知单', key: 'pur-notice' },
    ]
  },
  { 
    icon: Factory, 
    label: '生产管理', 
    key: 'prod',
    subItems: [
      { icon: Layers, label: '工单管理', key: 'orders' },
      { icon: ClipboardList, label: '生产任务', key: 'tasks' },
    ]
  },
  { 
    icon: Box, 
    label: '仓储管理', 
    key: 'wms',
    subItems: [
      { icon: Box, label: '入库单管理', key: 'wms-in' },
      { icon: Truck, label: '出库单管理', key: 'wms-out' },
      { icon: CheckSquare, label: '盘点单管理', key: 'wms-check' },
    ]
  },
  { 
    icon: Coins, 
    label: '财务管理', 
    key: 'finance',
    subItems: [
      { icon: Coins, label: '应收账款管理', key: 'fin-ar' },
      { icon: CreditCard, label: '应付账款管理', key: 'fin-ap' },
      { icon: Calculator, label: '成本核算管理', key: 'fin-cost' },
    ]
  },
  { 
    icon: BarChart, 
    label: '报表中心', 
    key: 'report',
    subItems: [
      { icon: BarChart, label: '生产报表中心', key: 'rep-prod' },
      { icon: PieChart, label: '质量分析报表', key: 'rep-qc' },
    ]
  },
  { icon: MessageSquare, label: '消息管理', key: 'msg' },
  { icon: LayoutDashboard, label: '大屏看板', key: 'board' },
  { icon: Settings, label: '系统管理', key: 'sys' },
  { icon: GitBranch, label: '流程管理', key: 'process' },
];

export default function MainLayout({ children, activeMenu = 'orders', onSelectMenu }: MainLayoutProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [hoveredTop, setHoveredTop] = useState<number>(60);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (key: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTop(rect.top);
    setHoveredKey(key);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredKey(null);
    }, 200);
  };

  const handleSubMenuMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const activeHoverItem = SIDEBAR_ITEMS.find(item => item.key === hoveredKey);

  return (
    <div className="flex h-screen w-screen bg-[#f3f4f6] overflow-hidden select-none">
      {/* Primary Left Sidebar */}
      <aside className="w-[76px] shrink-0 bg-[#061427] flex flex-col h-full overflow-y-auto custom-scrollbar shadow-2xl z-40 relative">
        <div className="h-[52px] shrink-0 flex items-center justify-center border-b border-slate-800/60 bg-[#051020]">
           <div className="w-8 h-8 bg-blue-600 rounded-lg text-white flex items-center justify-center font-bold text-xl italic font-serif shadow-md">
             T
           </div>
        </div>

        <div className="flex-1 py-3 flex flex-col gap-1 items-center">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isProd = item.key === 'prod';
            const isHovered = hoveredKey === item.key;

            return (
              <div 
                key={item.key} 
                className="relative w-full flex justify-center"
                onMouseEnter={(e) => handleMouseEnter(item.key, e)}
                onMouseLeave={handleMouseLeave}
              >
                <button 
                  onClick={() => {
                    if (isProd) {
                      onSelectMenu?.(activeMenu === 'orders' ? 'tasks' : 'orders');
                    }
                  }}
                  className={cn(
                    "w-[64px] flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all relative cursor-pointer group",
                    isProd || isHovered
                      ? "bg-[#132A4A] text-white shadow-sm" 
                      : "text-slate-300 hover:text-white hover:bg-[#0E2038]"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-transform duration-200 stroke-[1.6]",
                    (isProd || isHovered) ? "text-white scale-105" : "text-slate-300 group-hover:text-white"
                  )} />
                  <span className="text-[11px] font-medium leading-none tracking-tight">
                    {item.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Floating Secondary Sub-Menu Card on Hover (Floating beside sidebar) */}
      {hoveredKey && activeHoverItem?.subItems && (
        <div 
          onMouseEnter={handleSubMenuMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="fixed left-[72px] z-50 animate-in fade-in zoom-in-95 duration-150 pl-2"
          style={{
            top: `${Math.max(10, Math.min(hoveredTop, window.innerHeight - (activeHoverItem.subItems.length * 52 + 40)))}px`
          }}
        >
          <div className="bg-[#07162B] border border-[#183256] shadow-[0_16px_48px_rgba(0,0,0,0.65)] rounded-[20px] p-2.5 w-[210px] flex flex-col gap-1">
            {activeHoverItem.subItems.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = activeHoverItem.key === 'prod' && (
                (sub.key === 'orders' && activeMenu === 'orders') || 
                (sub.key === 'tasks' && activeMenu === 'tasks')
              );

              return (
                <button
                  key={sub.key}
                  onClick={() => {
                    if (sub.key === 'orders' || sub.key === 'tasks') {
                      onSelectMenu?.(sub.key as 'orders' | 'tasks');
                    }
                  }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-[13px] font-medium flex items-center gap-3.5 transition-all cursor-pointer text-left group/sub",
                    isSubActive
                      ? "bg-[#142E50] text-white font-semibold shadow-sm"
                      : "text-slate-200 hover:bg-[#11243E] hover:text-white"
                  )}
                >
                  <SubIcon className={cn(
                    "w-4.5 h-4.5 stroke-[1.8] transition-colors",
                    isSubActive ? "text-blue-400" : "text-slate-400 group-hover/sub:text-slate-200"
                  )} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-[52px] bg-white border-b border-slate-200 shrink-0 flex items-center justify-between px-4 z-10">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[13px] text-slate-500 font-medium">
                 <button 
                  className="flex items-center gap-1.5 text-slate-800 hover:text-blue-600 cursor-pointer font-medium"
                 >
                    <Factory className="w-4 h-4 stroke-[1.5] text-slate-400" />
                    生产管理
                 </button>
                 <span>/</span>
                 
                 {/* Current Module Dropdown Selector */}
                 <div className="relative group">
                    <button className="flex items-center gap-1 text-slate-900 font-bold hover:text-blue-600 cursor-pointer py-1">
                      {activeMenu === 'orders' ? (
                        <span className="flex items-center gap-1.5 text-blue-600">
                          <Layers className="w-4 h-4 stroke-[1.5]" />
                          工单管理
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-blue-600">
                          <ClipboardList className="w-4 h-4 stroke-[1.5]" />
                          生产任务
                        </span>
                      )}
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <div className="absolute left-0 top-full hidden group-hover:flex flex-col bg-white border border-slate-200 rounded-md shadow-lg py-1 min-w-[120px] z-50">
                      <button
                        onClick={() => onSelectMenu?.('orders')}
                        className={cn(
                          "px-3 py-1.5 text-xs text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer",
                          activeMenu === 'orders' && "font-bold text-blue-600 bg-blue-50/50"
                        )}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>工单管理</span>
                      </button>
                      <button
                        onClick={() => onSelectMenu?.('tasks')}
                        className={cn(
                          "px-3 py-1.5 text-xs text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer",
                          activeMenu === 'tasks' && "font-bold text-blue-600 bg-blue-50/50"
                        )}
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>生产任务</span>
                      </button>
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <div className="relative">
                 <select className="appearance-none bg-slate-50 border border-slate-200 rounded px-3 py-1.5 pr-8 text-[12px] text-slate-600 outline-none w-[180px] cursor-pointer">
                    <option>演示默认租户</option>
                 </select>
                 <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="flex items-center gap-3 border-l border-slate-100 pl-4 text-slate-400">
                 <button className="hover:text-slate-600 transition-colors"><Smartphone className="w-4 h-4" /></button>
                 <button className="hover:text-slate-600 transition-colors"><Maximize className="w-4 h-4" /></button>
                 <button className="hover:text-slate-600 transition-colors"><Search className="w-4 h-4" /></button>
                 <button className="hover:text-slate-600 transition-colors"><Settings className="w-4 h-4" /></button>
                 <button className="hover:text-slate-600 transition-colors text-[13px] font-bold">TT</button>
                 <button className="hover:text-slate-600 transition-colors"><Globe className="w-4 h-4" /></button>
                 
                 <button className="hover:text-slate-600 transition-colors relative ml-1">
                    <Bell className="w-4.5 h-4.5" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  </button>
                 
                 <div className="w-7 h-7 rounded-full bg-indigo-600 ml-2 shadow-inner flex items-center justify-center text-white text-xs overflow-hidden shrink-0">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=4f46e5" alt="Avatar" className="w-full h-full object-cover" />
                 </div>
              </div>
           </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-hidden relative">
           {children}
        </main>
      </div>
    </div>
  );
}
