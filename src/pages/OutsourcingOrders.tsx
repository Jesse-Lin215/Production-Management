import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, Home, RefreshCw, LayoutGrid, Search,
  Plus, ListChecks, FileCheck2, Lock, List, SlidersHorizontal, ArrowUpDown,
  Filter, Calendar, Settings, CheckSquare, Cpu, CheckCircle2, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  getOutsourcingOrders,
  updateOutsourcingOrders,
  OutsourcingOrderItem,
  formatOrderSalesOrders,
  formatOrderMaterialsInfo
} from '../outsourcingStore';
import { OverflowTooltipCell, ResizableTh } from '../components/OverflowTooltipCell';

interface OutsourcingOrdersProps {
  onNewOrder: () => void;
  onEditOrder: (orderNo: string) => void;
  onOrderClick: (orderNo: string) => void;
  onNavigateOrders?: () => void;
}

export default function OutsourcingOrders({
  onNewOrder,
  onEditOrder,
  onOrderClick,
  onNavigateOrders
}: OutsourcingOrdersProps) {
  const [orders, setOrders] = useState<OutsourcingOrderItem[]>(() => getOutsourcingOrders());
  const [activeTab, setActiveTab] = useState<string>('全部');
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [jumpPage, setJumpPage] = useState<string>('1');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const draftCount = orders.filter(o => o.status === '草稿').length;
  const approvalCount = orders.filter(o => o.status === '待审核').length;
  const rejectedCount = orders.filter(o => o.status === '审批驳回').length;
  const inProgressCount = orders.filter(o => o.status === '进行中').length;
  const waitReceiptCount = orders.filter(o => o.status === '待入库').length;
  const completedCount = orders.filter(o => o.status === '已完成').length;
  const voidCount = orders.filter(o => o.status === '已作废').length;

  const statusTabs = [
    { key: '全部', label: '全部', count: null },
    { key: '草稿', label: '草稿', count: draftCount },
    { key: '待审核', label: '待审核', count: approvalCount },
    { key: '审批驳回', label: '审批驳回', count: rejectedCount },
    { key: '进行中', label: '进行中', count: inProgressCount },
    { key: '待入库', label: '待入库', count: waitReceiptCount },
    { key: '已完成', label: '已完成', count: completedCount },
    { key: '已作废', label: '已作废', count: voidCount },
  ];

  const [colWidths, setColWidths] = useState<Record<string, number>>({
    seq: 64,
    orderNo: 175,
    salesOrder: 215,
    materialInfo: 215,
    supplierName: 175,
    outsourcingType: 110,
    productionProgress: 150,
    receiptProgress: 150,
    plannedQty: 95,
    plannedDeliveryDate: 120,
    contactPhone: 125,
    taxIncludedAmount: 115,
    creator: 95,
    createTime: 155,
    status: 96,
    actions: 150
  });

  const handleStartResize = (e: React.MouseEvent, colKey: string, minWidth = 70) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] ?? 120;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColWidths(prev => ({
        ...prev,
        [colKey]: Math.max(minWidth, startWidth + deltaX)
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

  const totalTableWidth = (Object.values(colWidths) as number[]).reduce((sum, w) => sum + w, 0);

  const filteredOrders = orders.filter(item => {
    if (activeTab !== '全部' && item.status !== activeTab) return false;
    if (appliedSearch.trim()) {
      const q = appliedSearch.trim().toLowerCase();
      const matchOrder = item.orderNo.toLowerCase().includes(q);
      const matchApp = (item.outsourcingAppNo || '').toLowerCase().includes(q);
      const matchMo = item.moNo.toLowerCase().includes(q);
      const matchSo = formatOrderSalesOrders(item).toLowerCase().includes(q);
      const matchMat = formatOrderMaterialsInfo(item).toLowerCase().includes(q);
      if (!matchOrder && !matchApp && !matchMo && !matchSo && !matchMat) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmitApproval = (orderNo: string) => {
    const next = orders.map(o =>
      o.orderNo === orderNo ? { ...o, status: '待审核' as const } : o
    );
    updateOutsourcingOrders(next);
    setOrders(next);
    showToast(`外协工单 ${orderNo} 已提交审批，状态流转为待审核`);
  };

  const handleVoidOrder = (orderNo: string) => {
    const next = orders.map(o =>
      o.orderNo === orderNo ? { ...o, status: '已作废' as const } : o
    );
    updateOutsourcingOrders(next);
    setOrders(next);
    showToast(`外协工单 ${orderNo} 已作废`);
  };

  const handleUnapproveOrder = (orderNo: string) => {
    const target = orders.find(o => o.orderNo === orderNo);
    if (target && Number(target.productionProgress) > 0) {
      showToast('该外协工单已有生产进度，不可反审批');
      return;
    }
    const next = orders.map(o =>
      o.orderNo === orderNo ? { ...o, status: '草稿' as const } : o
    );
    updateOutsourcingOrders(next);
    setOrders(next);
    showToast(`外协工单 ${orderNo} 已反审批，状态流转为草稿`);
  };

  const handleDeleteOrder = (orderNo: string) => {
    const next = orders.filter(o => o.orderNo !== orderNo);
    updateOutsourcingOrders(next);
    setOrders(next);
    setSelectedIds(prev => prev.filter(id => id !== orderNo));
    showToast(`外协工单 ${orderNo} 已删除`);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6f9] w-full overflow-hidden relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Multi-Tab Navigation Bar */}
      <div className="h-[40px] bg-white border-b border-slate-200/80 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onNavigateOrders}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[12px] cursor-pointer transition-colors"
          >
            <Home className="w-3 h-3 text-blue-600" />
            <span>首页</span>
          </button>

          <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-blue-500 bg-blue-50/70 text-blue-600 font-medium text-[12px] cursor-pointer shadow-2xs">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>外协工单</span>
          </button>

          <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer transition-colors">
            <span>新增采购订单</span>
          </button>

          <button
            onClick={onNewOrder}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer transition-colors"
          >
            <span>新增外协工单</span>
          </button>

          <button
            onClick={onNavigateOrders}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>工单管理</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-400 pl-2 border-l border-slate-100">
          <button className="p-1 hover:text-slate-600 cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
          <button
            onClick={() => setOrders([...getOutsourcingOrders()])}
            className="p-1 hover:text-slate-600 cursor-pointer"
            title="刷新"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:text-slate-600 cursor-pointer"><LayoutGrid className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Main White Card Container (Unified style with OutsourcingApplications) */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden p-4">
          {/* Row 1: Status Tabs + Search Input */}
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-6 text-[13px]">
              {statusTabs.map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "relative pb-1.5 transition-colors cursor-pointer",
                      isActive
                        ? "text-blue-600 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span>
                      {tab.label}
                      {tab.count !== null && <span className="ml-1">({tab.count})</span>}
                    </span>
                    {isActive && (
                      <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-blue-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setAppliedSearch(searchInput);
                    setCurrentPage(1);
                  }
                }}
                placeholder="请输入外协工单号、销售订单..."
                className="w-[210px] h-[32px] px-3 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  setAppliedSearch(searchInput);
                  setCurrentPage(1);
                }}
                className="h-[32px] px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>搜索</span>
              </button>
            </div>
          </div>

          {/* Row 2: Action Buttons Toolbar */}
          <div className="flex items-center justify-between py-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onNewOrder}
                className="h-[32px] px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    showToast('请先勾选需要批量操作的外协工单');
                  } else {
                    showToast(`已对选中的 ${selectedIds.length} 条工单执行批量操作`);
                  }
                }}
                className="h-[32px] px-3.5 rounded-lg border border-blue-500 bg-white hover:bg-blue-50/50 text-blue-600 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>批量操作</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    showToast('请先勾选需要批量提交审批的外协工单');
                  } else {
                    const next = orders.map(o =>
                      selectedIds.includes(o.id) ? { ...o, status: '待审核' as const } : o
                    );
                    updateOutsourcingOrders(next);
                    setOrders(next);
                    setSelectedIds([]);
                    showToast('已批量提交审批批次，状态更新为待审核');
                  }
                }}
                className="h-[32px] px-3.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-amber-600 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>审批批次</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-[32px] h-[32px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer"
                title="锁定列"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="w-[32px] h-[32px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer"
                title="列表模式"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="w-[32px] h-[32px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer"
                title="字段配置"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Data Table (Supports draggable column width + ellipsis + hover full tooltip) */}
          <div className="flex-1 border border-slate-200/70 rounded-lg overflow-auto custom-scrollbar">
            <table
              style={{ width: totalTableWidth, minWidth: '100%' }}
              className="table-fixed border-collapse text-center text-[12px] whitespace-nowrap"
            >
              <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-800 font-bold sticky top-0 z-20">
                <tr className="h-[40px]">
                  <ResizableTh
                    colKey="seq"
                    width={colWidths.seq}
                    minWidth={56}
                    onStartResize={handleStartResize}
                    className="sticky left-0 z-30 bg-[#f8fafc]"
                  >
                    序号
                  </ResizableTh>

                  <ResizableTh
                    colKey="orderNo"
                    width={colWidths.orderNo}
                    minWidth={130}
                    onStartResize={handleStartResize}
                    styleLeft={colWidths.seq}
                    className="sticky z-30 bg-[#f8fafc] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>外协工单</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="salesOrder"
                    width={colWidths.salesOrder}
                    minWidth={110}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>销售订单</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="materialInfo"
                    width={colWidths.materialInfo}
                    minWidth={110}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>物料信息</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="supplierName"
                    width={colWidths.supplierName}
                    minWidth={110}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>供应商信息</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="outsourcingType"
                    width={colWidths.outsourcingType}
                    minWidth={90}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>外协类型</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="productionProgress"
                    width={colWidths.productionProgress}
                    minWidth={120}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>生产进度</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="receiptProgress"
                    width={colWidths.receiptProgress}
                    minWidth={120}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>入库进度</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="plannedQty"
                    width={colWidths.plannedQty}
                    minWidth={85}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>计划数量</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="plannedDeliveryDate"
                    width={colWidths.plannedDeliveryDate}
                    minWidth={100}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>计划交期</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="contactPhone"
                    width={colWidths.contactPhone}
                    minWidth={100}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>联系电话</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="taxIncludedAmount"
                    width={colWidths.taxIncludedAmount}
                    minWidth={95}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>含税金额</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="creator"
                    width={colWidths.creator}
                    minWidth={80}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>创建人</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="createTime"
                    width={colWidths.createTime}
                    minWidth={120}
                    onStartResize={handleStartResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>创建时间</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="status"
                    width={colWidths.status}
                    minWidth={84}
                    onStartResize={handleStartResize}
                    styleRight={colWidths.actions}
                    className="sticky z-30 bg-[#f8fafc] border-l border-slate-200/70 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]"
                  >
                    <div className="inline-flex items-center gap-1">
                      <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>状态</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="actions"
                    width={colWidths.actions}
                    minWidth={130}
                    onStartResize={handleStartResize}
                    hideResizer
                    className="sticky right-0 z-30 bg-[#f8fafc] border-l border-slate-100"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>操作</span>
                      <Settings className="w-3 h-3 text-slate-400 shrink-0" />
                    </div>
                  </ResizableTh>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedOrders.map((row, index) => {
                  const isSelected = selectedIds.includes(row.id);
                  const isHovered = hoveredRowId === row.id;
                  const rowBg = isSelected ? 'bg-blue-50/40' : isHovered ? 'bg-blue-50/20' : 'bg-white';
                  const salesOrderText = formatOrderSalesOrders(row);
                  const materialInfoText = formatOrderMaterialsInfo(row);

                  return (
                    <tr
                      key={row.id}
                      onMouseEnter={() => setHoveredRowId(row.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      className={cn("h-[44px] transition-colors", rowBg)}
                    >
                      <td
                        style={{ width: colWidths.seq, minWidth: colWidths.seq, maxWidth: colWidths.seq }}
                        onClick={() => handleToggleSelect(row.id)}
                        className={cn("sticky left-0 z-10 px-3 border-r border-slate-100/80 cursor-pointer", rowBg)}
                      >
                        {isSelected || isHovered ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-600">{(safePage - 1) * pageSize + index + 1}</span>
                        )}
                      </td>

                      <td
                        style={{
                          width: colWidths.orderNo,
                          minWidth: colWidths.orderNo,
                          maxWidth: colWidths.orderNo,
                          left: colWidths.seq
                        }}
                        className={cn("sticky z-10 px-3 border-r border-slate-200/70 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]", rowBg)}
                      >
                        <OverflowTooltipCell text={row.orderNo}>
                          <button
                            type="button"
                            onClick={() => onOrderClick(row.orderNo)}
                            className="text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
                          >
                            {row.orderNo}
                          </button>
                        </OverflowTooltipCell>
                      </td>

                      <td
                        style={{ width: colWidths.salesOrder, minWidth: colWidths.salesOrder, maxWidth: colWidths.salesOrder }}
                        className="px-3 border-r border-slate-100/70 text-slate-800 font-medium"
                      >
                        <OverflowTooltipCell text={salesOrderText} />
                      </td>

                      <td
                        style={{ width: colWidths.materialInfo, minWidth: colWidths.materialInfo, maxWidth: colWidths.materialInfo }}
                        className="px-3 border-r border-slate-100/70 text-slate-800"
                      >
                        <OverflowTooltipCell text={materialInfoText} />
                      </td>

                      <td
                        style={{ width: colWidths.supplierName, minWidth: colWidths.supplierName, maxWidth: colWidths.supplierName }}
                        className="px-3 border-r border-slate-100/70 text-slate-700"
                      >
                        <OverflowTooltipCell text={row.supplierName} />
                      </td>

                      <td
                        style={{ width: colWidths.outsourcingType, minWidth: colWidths.outsourcingType, maxWidth: colWidths.outsourcingType }}
                        className="px-3 border-r border-slate-100/70"
                      >
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border",
                            row.outsourcingType === '整单外协'
                              ? "bg-amber-50 text-amber-600 border-amber-200/80"
                              : "bg-blue-50 text-blue-600 border-blue-200/80"
                          )}
                        >
                          {row.outsourcingType}
                        </span>
                      </td>

                      <td
                        style={{ width: colWidths.productionProgress, minWidth: colWidths.productionProgress, maxWidth: colWidths.productionProgress }}
                        className="px-3 border-r border-slate-100/70"
                      >
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-[72px] h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${row.productionProgress}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-700 w-7 text-right shrink-0">
                            {row.productionProgress}%
                          </span>
                        </div>
                      </td>

                      <td
                        style={{ width: colWidths.receiptProgress, minWidth: colWidths.receiptProgress, maxWidth: colWidths.receiptProgress }}
                        className="px-3 border-r border-slate-100/70"
                      >
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-[72px] h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${row.receiptProgress}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-700 w-7 text-right shrink-0">
                            {row.receiptProgress}%
                          </span>
                        </div>
                      </td>

                      <td
                        style={{ width: colWidths.plannedQty, minWidth: colWidths.plannedQty, maxWidth: colWidths.plannedQty }}
                        className="px-3 border-r border-slate-100/70 text-slate-800"
                      >
                        <OverflowTooltipCell text={String(row.plannedQty)} />
                      </td>

                      <td
                        style={{ width: colWidths.plannedDeliveryDate, minWidth: colWidths.plannedDeliveryDate, maxWidth: colWidths.plannedDeliveryDate }}
                        className="px-3 border-r border-slate-100/70 text-slate-700"
                      >
                        <OverflowTooltipCell text={row.plannedDeliveryDate} />
                      </td>

                      <td
                        style={{ width: colWidths.contactPhone, minWidth: colWidths.contactPhone, maxWidth: colWidths.contactPhone }}
                        className="px-3 border-r border-slate-100/70 text-slate-700"
                      >
                        <OverflowTooltipCell text={row.contactPhone} />
                      </td>

                      <td
                        style={{ width: colWidths.taxIncludedAmount, minWidth: colWidths.taxIncludedAmount, maxWidth: colWidths.taxIncludedAmount }}
                        className="px-3 border-r border-slate-100/70 text-slate-700"
                      >
                        <OverflowTooltipCell text={`¥${row.taxIncludedAmount.toLocaleString()}`} />
                      </td>

                      <td
                        style={{ width: colWidths.creator, minWidth: colWidths.creator, maxWidth: colWidths.creator }}
                        className="px-3 border-r border-slate-100/70 text-slate-700"
                      >
                        <OverflowTooltipCell text={row.creator} />
                      </td>

                      <td
                        style={{ width: colWidths.createTime, minWidth: colWidths.createTime, maxWidth: colWidths.createTime }}
                        className="px-3 border-r border-slate-100/70 text-slate-600"
                      >
                        <OverflowTooltipCell text={row.createTime} />
                      </td>

                      <td
                        style={{
                          width: colWidths.status,
                          minWidth: colWidths.status,
                          maxWidth: colWidths.status,
                          right: colWidths.actions
                        }}
                        className={cn("sticky z-10 px-3 border-l border-slate-200/70 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.05)]", rowBg)}
                      >
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium",
                            row.status === '进行中'
                              ? "bg-blue-50 text-blue-600"
                              : row.status === '待审核' || row.status === '待入库'
                              ? "bg-amber-50 text-amber-600"
                              : row.status === '审批驳回'
                              ? "bg-red-50 text-red-600"
                              : row.status === '已完成'
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td
                        style={{ width: colWidths.actions, minWidth: colWidths.actions, maxWidth: colWidths.actions }}
                        className={cn("sticky right-0 z-10 px-3 border-l border-slate-100", rowBg)}
                      >
                        {row.status === '草稿' || row.status === '审批驳回' ? (
                          <div className="inline-flex items-center justify-center gap-1.5 text-[12px]">
                            <button
                              type="button"
                              onClick={() => onEditOrder(row.orderNo)}
                              className="text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              编辑
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleSubmitApproval(row.orderNo)}
                              className="text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              提交审批
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(row.orderNo)}
                              className="text-red-500 hover:text-red-600 cursor-pointer"
                            >
                              删除
                            </button>
                          </div>
                        ) : row.status === '进行中' ? (
                          <div className="inline-flex items-center justify-center gap-1.5 text-[12px]">
                            {Number(row.productionProgress) === 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUnapproveOrder(row.orderNo)}
                                  className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                >
                                  反审批
                                </button>
                                <span className="text-slate-300">|</span>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleVoidOrder(row.orderNo)}
                              className="text-red-500 hover:text-red-600 font-medium cursor-pointer"
                            >
                              作废
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {paginatedOrders.length === 0 && (
                  <tr>
                    <td colSpan={16} className="py-16 text-center text-slate-400 text-xs">
                      暂无符合条件的外协工单数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Bar */}
          <div className="pt-3 flex items-center justify-between text-[12px] text-slate-600 shrink-0 select-none">
            <div className="text-slate-400">
              已选中 {selectedIds.length} 条
            </div>

            <div className="flex items-center gap-2.5">
              <span>共 {filteredOrders.length} 条</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                    setJumpPage('1');
                  }}
                  className="h-[28px] pl-2.5 pr-7 rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={10}>10条/页</option>
                  <option value={20}>20条/页</option>
                  <option value={50}>50条/页</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    const prev = Math.max(1, safePage - 1);
                    setCurrentPage(prev);
                    setJumpPage(String(prev));
                  }}
                  className="w-[28px] h-[28px] rounded-md border border-slate-100 bg-slate-50/70 text-slate-400 flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCurrentPage(p);
                      setJumpPage(String(p));
                    }}
                    className={cn(
                      "min-w-[28px] h-[28px] px-2 rounded-md text-[12px] font-medium transition-colors cursor-pointer",
                      safePage === p
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    const next = Math.min(totalPages, safePage + 1);
                    setCurrentPage(next);
                    setJumpPage(String(next));
                  }}
                  className="w-[28px] h-[28px] rounded-md border border-slate-100 bg-slate-50/70 text-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span>前往</span>
                <input
                  type="text"
                  value={jumpPage}
                  onChange={e => setJumpPage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const num = parseInt(jumpPage, 10);
                      if (!isNaN(num)) {
                        const target = Math.min(totalPages, Math.max(1, num));
                        setCurrentPage(target);
                        setJumpPage(String(target));
                      }
                    }
                  }}
                  className="w-[44px] h-[28px] text-center rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 focus:outline-none focus:border-blue-500"
                />
                <span>页</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
