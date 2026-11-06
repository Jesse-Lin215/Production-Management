import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Box, Calendar, QrCode, Info, Search, ArrowDown, PackageOpen, FileText, Filter } from 'lucide-react';
import SchedulingPanel from '../components/SchedulingPanel';
import TaskPanel from '../components/TaskPanel';
import BomTree from '../components/BomTree';
import { initialBomTree } from '../data';
import { getOrders, getOrderSchedulePlan, saveOrderSchedulePlan, getRecommendedWorkCenter, getRecommendedEmployee, OrderItem } from '../mockStore';
import { BomNode, SchedulePlanItem } from '../types';

interface OrderDetailsProps {
  orderNo: string;
  onBack: () => void;
  onTaskClick?: (taskCode: string, task?: any) => void;
}

interface ProcessRouteRow {
  id: string;
  seq: number;
  opCode: string;
  opName: string;
  workStationCode: string;
  workStationName: string;
  processType: '自制' | '委外';
  reportingMode: '计时报工' | '计件报工';
  remark: string;
  enabled: boolean;
}

interface ProcessDependencyBlock {
  id: string;
  title: string;
  opCodes: string[];
  relationToNext: 'S-to-S' | 'F-to-S' | 'F-to-F' | 'S-to-F';
}

interface NodeRoutingState {
  rows: ProcessRouteRow[];
  blocks: ProcessDependencyBlock[];
}

function buildDependencyBlocksFromCodes(codes: string[]): ProcessDependencyBlock[] {
  if (codes.length === 0) {
    return [];
  } else if (codes.length === 1) {
    return [
      { id: 'dep-block-1', title: '工序块1', opCodes: [codes[0]], relationToNext: 'S-to-S' }
    ];
  } else if (codes.length === 2) {
    return [
      { id: 'dep-block-1', title: '工序块1', opCodes: [codes[0]], relationToNext: 'S-to-S' },
      { id: 'dep-block-2', title: '工序块2', opCodes: [codes[1]], relationToNext: 'S-to-S' }
    ];
  } else if (codes.length === 3) {
    return [
      { id: 'dep-block-1', title: '工序块1', opCodes: [codes[0], codes[1]], relationToNext: 'S-to-S' },
      { id: 'dep-block-2', title: '工序块2', opCodes: [codes[2]], relationToNext: 'S-to-S' }
    ];
  } else if (codes.length === 4) {
    return [
      { id: 'dep-block-1', title: '工序块1', opCodes: [codes[0], codes[1]], relationToNext: 'S-to-S' },
      { id: 'dep-block-2', title: '工序块2', opCodes: [codes[2], codes[3]], relationToNext: 'S-to-S' }
    ];
  } else {
    return [
      { id: 'dep-block-1', title: '工序块1', opCodes: [codes[0], codes[1]], relationToNext: 'S-to-S' },
      { id: 'dep-block-2', title: '工序块2', opCodes: codes.slice(2, codes.length - 1), relationToNext: 'S-to-S' },
      { id: 'dep-block-3', title: '工序块3', opCodes: [codes[codes.length - 1]], relationToNext: 'S-to-S' }
    ];
  }
}

function getStandardProcessCode(procName: string, index: number): string {
  const codeMap: Record<string, string> = {
    '编程下图': 'PROCESS-00001',
    'CNC': 'PROCESS-00002',
    '钳工组装': 'PROCESS-00003',
    '电工组装': 'PROCESS-00004',
    '车床': 'PROCESS-00005',
    '机加铣床': 'PROCESS-00006',
    '线割加工': 'PROCESS-00007',
    '攻牙': 'PROCESS-00008',
    '钳工调试': 'PROCESS0030',
    'SMT贴片': 'PROCESS-00011',
    '回流焊': 'PROCESS-00012',
    '功能测试': 'PROCESS-00013',
    '包装入库': 'PROCESS-00014',
    '结构件机加': 'PROCESS-00015',
    '总装调试': 'PROCESS-00016',
  };
  return codeMap[procName] || `PROCESS-${String(index + 1).padStart(5, '0')}`;
}

function getStandardWorkStationDisplay(procName: string, fallbackWc: { code: string; name: string }): { code: string; name: string } {
  const wsMap: Record<string, { code: string; name: string }> = {
    '钳工组装': { code: 'WS-00003', name: '钳工组装工作站' },
    '电工组装': { code: 'WS-00004', name: '电工组装工作站' },
    '钳工调试': { code: 'WS0044', name: '钳工调试工作站' },
  };
  return wsMap[procName] || fallbackWc;
}

function parseSalesOrderList(orderData: OrderItem): string[] {
  const raw = (orderData.so || 'XZZQ-26C-067 第4项').trim();
  const parts = raw
    .split(/[,，、;；]+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return ['XZZQ-26C-067 第4项'];
  }

  const defaultLineNum = parseInt(orderData.lineItem || '4', 10) || 4;
  return parts.map((item, idx) => {
    if (/第\s*\d+\s*项/.test(item)) {
      return item;
    }
    const lineNo = idx === 0 ? defaultLineNum : idx + 1;
    return `${item} 第${lineNo}项`;
  });
}

type SectionKey = 'info' | 'bom' | 'routing' | 'schedule' | 'tasks';

const SECTION_TABS: { id: SectionKey; label: string }[] = [
  { id: 'info', label: '基本信息' },
  { id: 'bom', label: 'BOM组成' },
  { id: 'routing', label: '工艺路线与工序' },
  { id: 'schedule', label: '排产计划' },
  { id: 'tasks', label: '生产任务' }
];

export default function OrderDetails({ orderNo, onBack, onTaskClick }: OrderDetailsProps) {
  const [activeTab, setActiveTab] = useState<SectionKey>('info');
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    info: false,
    bom: false,
    routing: false,
    schedule: false,
    tasks: false,
  });
  const [poolSearch, setPoolSearch] = useState('');
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  // Left product structure & right routing view state (matching OrderWizard Step 3)
  const [isRoutingSidebarOpen, setIsRoutingSidebarOpen] = useState<boolean>(true);
  const [routingCategoryFilter, setRoutingCategoryFilter] = useState<string>('全部');
  const [routingSubTab, setRoutingSubTab] = useState<'list' | 'dependency'>('list');
  const [activeRoutingNodeId, setActiveRoutingNodeId] = useState<string>(`order-${orderNo}`);
  const [checkedRoutingNodes, setCheckedRoutingNodes] = useState<Set<string>>(new Set());

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<SectionKey, HTMLElement | null>>({
    info: null,
    bom: null,
    routing: null,
    schedule: null,
    tasks: null,
  });
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const toggleSectionCollapse = (id: SectionKey) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAnchorClick = (id: SectionKey) => {
    setActiveTab(id);
    // If target section is collapsed, expand it so user can view it
    setCollapsedSections(prev => (prev[id] ? { ...prev, [id]: false } : prev));

    const container = scrollContainerRef.current;
    const targetEl = sectionRefs.current[id];
    if (!container || !targetEl) return;

    isProgrammaticScrollRef.current = true;
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const offsetTop = targetRect.top - containerRect.top + container.scrollTop - 16;
      container.scrollTo({
        top: Math.max(0, offsetTop),
        behavior: 'smooth',
      });

      scrollTimeoutRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    });
  };

  const handleContainerScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerTop = container.getBoundingClientRect().top;
    const triggerOffset = 80;

    // If scrolled to the very bottom, activate the last visible section
    if (Math.ceil(container.scrollTop + container.clientHeight) >= container.scrollHeight - 10) {
      setActiveTab('tasks');
      return;
    }

    let currentActive: SectionKey = 'info';
    for (const tab of SECTION_TABS) {
      const el = sectionRefs.current[tab.id];
      if (!el) continue;
      const topRel = el.getBoundingClientRect().top - containerTop;
      if (topRel <= triggerOffset) {
        currentActive = tab.id;
      } else {
        break;
      }
    }
    if (currentActive !== activeTab) {
      setActiveTab(currentActive);
    }
  };

  // Retrieve current order data from mock store
  const allOrders = getOrders();
  const orderData: OrderItem = allOrders.find(o => o.no === orderNo) || {
    id: 1,
    no: orderNo,
    type: '成品自制',
    priority: '中',
    product: '2米移栽机',
    productCode: 'CG-00002',
    qty: 5,
    customer: '华为技术有限公司',
    so: 'XZZQ-26C-067 第4项',
    lineItem: '04',
    plannedStart: '2026-08-25',
    plannedEnd: '2026-09-05',
    overallProgress: 35,
    status: '进行中' as const,
    processes: ['编程下图', 'CNC', '车床', '机加铣床', '线割加工', '攻牙'],
    scheduledProcessMap: {}
  };

  const salesOrderList = useMemo(() => parseSalesOrderList(orderData), [orderData]);
  const fullSalesOrderText = useMemo(() => salesOrderList.join('、'), [salesOrderList]);

  // Local state for schedule plan map, seeded from mock store
  const [schedulePlanMap, setSchedulePlanMap] = useState<Record<string, SchedulePlanItem>>(() => {
    const saved = getOrderSchedulePlan(orderNo);
    if (Object.keys(saved).length > 0) return saved;

    // Default mock schedule plan for operations
    const initialMap: Record<string, SchedulePlanItem> = {};
    (orderData.processes || []).forEach((procName: string, idx: number) => {
      const recWc = getRecommendedWorkCenter(procName);
      const recEmp = getRecommendedEmployee(procName);
      const key = `plan-${orderNo}-${procName}`;
      initialMap[key] = {
        id: key,
        nodeId: `order-${orderNo}`,
        opId: `op-${orderNo}-${idx}`,
        materialCode: orderData.productCode,
        materialName: orderData.product,
        opName: procName,
        stepIdx: idx + 1,
        scheduledQuantity: orderData.qty || 1,
        workCenterCode: recWc.code,
        workCenterName: recWc.name,
        position: recEmp.position,
        employee: recEmp.name,
        plannedStartTime: `${orderData.plannedStart || '2026-08-25'}T08:30`,
        estimatedEndTime: `${orderData.plannedEnd || '2026-09-02'}T17:30`,
        isScheduled: true
      };
    });
    return initialMap;
  });

  // Product structure tree for the 工艺路线与工序 module (root product + child sub-assemblies/materials)
  const productStructureTree: BomNode = useMemo(() => {
    return {
      id: `order-${orderNo}`,
      name: orderData.product,
      code: orderData.productCode,
      type: 'PRODUCT' as const,
      quantity: orderData.qty || 1,
      children: initialBomTree.children || [],
      operations: (orderData.processes || []).map((p: string, idx: number) => {
        const recWc = getRecommendedWorkCenter(p);
        return {
          id: `op-${orderNo}-${idx}`,
          stepIdx: idx + 1,
          opCode: getStandardProcessCode(p, idx),
          opName: p,
          workCenter: recWc.name,
          workCenterCode: recWc.code,
          isEnabled: true,
          executionType: 'SELF' as const,
          reportingType: 'PIECE' as const,
          remark: ''
        };
      })
    };
  }, [orderData, orderNo]);

  // Per-node process rows and dependency blocks state
  const [nodeRoutingMap, setNodeRoutingMap] = useState<Record<string, NodeRoutingState>>({});

  useEffect(() => {
    const rootNodeId = `order-${orderNo}`;
    setActiveRoutingNodeId(rootNodeId);

    const map: Record<string, NodeRoutingState> = {};

    // Root node rows & blocks from orderData
    const rootRows: ProcessRouteRow[] = (orderData.processes || []).map((procName: string, idx: number) => {
      const savedPlan =
        schedulePlanMap[`plan-${orderNo}-${procName}`] ||
        schedulePlanMap[`op-${orderNo}-${idx}`];
      const recWc = getRecommendedWorkCenter(procName);
      const ws = getStandardWorkStationDisplay(procName, {
        code: savedPlan?.workCenterCode || recWc.code,
        name: savedPlan?.workCenterName || recWc.name,
      });

      return {
        id: `proc-${orderNo}-${idx}`,
        seq: idx + 1,
        opCode: getStandardProcessCode(procName, idx),
        opName: procName,
        workStationCode: ws.code,
        workStationName: ws.name,
        processType: '自制',
        reportingMode: '计时报工',
        remark: '-',
        enabled: true,
      };
    });

    map[rootNodeId] = {
      rows: rootRows,
      blocks: buildDependencyBlocksFromCodes(rootRows.map(r => r.opCode)),
    };

    // Populate child nodes from productStructureTree
    const populateChildren = (nodes?: BomNode[]) => {
      if (!nodes) return;
      nodes.forEach(child => {
        const childRows: ProcessRouteRow[] = (child.operations || []).map((op, idx) => {
          const recWc = getRecommendedWorkCenter(op.opName);
          return {
            id: `${child.id}-proc-${idx}`,
            seq: idx + 1,
            opCode: op.opCode || getStandardProcessCode(op.opName, idx),
            opName: op.opName,
            workCenterCode: op.workCenterCode || recWc.code,
            workCenterName: op.workCenter || recWc.name,
            workStationCode: `${op.workCenterCode || recWc.code}-S01`,
            workStationName: `${op.workCenter || recWc.name}1号工位`,
            processType: op.executionType === 'OUTSOURCE' ? '委外' : '自制',
            reportingMode: op.reportingType === 'TIME' ? '计时报工' : '计件报工',
            remark: op.remark || '-',
            enabled: op.isEnabled !== false,
          };
        });
        map[child.id] = {
          rows: childRows,
          blocks: buildDependencyBlocksFromCodes(childRows.map(r => r.opCode)),
        };
        if (child.children) {
          populateChildren(child.children);
        }
      });
    };

    populateChildren(productStructureTree.children);
    setNodeRoutingMap(map);
  }, [orderNo, productStructureTree]);

  // Helper to find node in productStructureTree
  const findStructureNode = (node: BomNode, targetId: string): BomNode | null => {
    if (node.id === targetId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findStructureNode(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const activeStructureNode = useMemo(() => {
    return findStructureNode(productStructureTree, activeRoutingNodeId) || productStructureTree;
  }, [productStructureTree, activeRoutingNodeId]);

  const currentNodeRouting = nodeRoutingMap[activeStructureNode.id] || { rows: [], blocks: [] };
  const processRows = currentNodeRouting.rows;
  const dependencyBlocks = currentNodeRouting.blocks;

  const unassignedProcesses = useMemo(() => {
    const assignedSet = new Set(dependencyBlocks.flatMap(b => b.opCodes));
    return processRows.filter(row => {
      if (assignedSet.has(row.opCode)) return false;
      if (!poolSearch.trim()) return true;
      const q = poolSearch.trim().toLowerCase();
      return row.opCode.toLowerCase().includes(q) || row.opName.toLowerCase().includes(q);
    });
  }, [processRows, dependencyBlocks, poolSearch]);

  const handleToggleRowEnabled = (rowId: string) => {
    const nodeId = activeStructureNode.id;
    setNodeRoutingMap(prev => {
      const current = prev[nodeId];
      if (!current) return prev;
      return {
        ...prev,
        [nodeId]: {
          ...current,
          rows: current.rows.map(r => (r.id === rowId ? { ...r, enabled: !r.enabled } : r)),
        },
      };
    });
  };

  const handleDropToBlock = (targetBlockId: string, opCode: string) => {
    if (!opCode) return;
    const nodeId = activeStructureNode.id;
    setNodeRoutingMap(prev => {
      const current = prev[nodeId];
      if (!current) return prev;
      return {
        ...prev,
        [nodeId]: {
          ...current,
          blocks: current.blocks.map(block => {
            const cleaned = block.opCodes.filter(c => c !== opCode);
            if (block.id === targetBlockId) {
              return { ...block, opCodes: [...cleaned, opCode] };
            }
            return { ...block, opCodes: cleaned };
          }),
        },
      };
    });
  };

  const handleUpdateSchedulePlan = (nodeId: string, opId: string, updates: Partial<SchedulePlanItem>) => {
    setSchedulePlanMap(prev => {
      const existing = prev[opId] || prev[`plan-${orderNo}-${opId}`];
      const updated = {
        ...existing,
        ...updates
      };
      const next = { ...prev, [opId]: updated };
      saveOrderSchedulePlan(orderNo, next);
      return next;
    });
  };

  // Parent order product info only for SchedulingPanel and TaskPanel
  const bomData = useMemo(() => {
    return {
      id: `order-${orderNo}`,
      name: orderData.product,
      code: orderData.productCode,
      type: 'PRODUCT' as const,
      quantity: orderData.qty || 1,
      children: [], // No child orders/parts, only the parent order product
      operations: (orderData.processes || []).map((p: string, idx: number) => {
        const recWc = getRecommendedWorkCenter(p);
        return {
          id: `op-${orderNo}-${idx}`,
          stepIdx: idx + 1,
          opCode: getStandardProcessCode(p, idx),
          opName: p,
          workCenter: recWc.name,
          workCenterCode: recWc.code,
          isEnabled: true,
          executionType: 'SELF' as const,
          reportingType: 'PIECE' as const,
          remark: ''
        };
      })
    };
  }, [orderData, orderNo]);

  return (
    <div className="flex flex-col h-full bg-white w-full relative overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800 font-mono">{orderNo}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                {orderData.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[13px] text-slate-500">
              {/* 销售订单字段（支持多个、过长省略及鼠标悬浮浮窗显示全量） */}
              <div className="relative group flex items-center gap-1 cursor-default">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="shrink-0">销售订单:</span>
                <span className="max-w-[180px] sm:max-w-[220px] truncate text-slate-700 font-medium font-mono">
                  {fullSalesOrderText}
                </span>
                {salesOrderList.length > 1 && (
                  <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-medium shrink-0">
                    共{salesOrderList.length}项
                  </span>
                )}

                {/* 鼠标悬浮浮窗显示全量销售订单 */}
                <div className="hidden group-hover:block absolute left-0 top-full pt-2 z-50 min-w-[260px] max-w-[360px]">
                  <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-xs text-slate-700">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <span className="font-bold text-slate-800">关联销售订单明细</span>
                      <span className="text-[11px] text-slate-400">共 {salesOrderList.length} 项</span>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {salesOrderList.map((soItem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-100 font-mono text-[12px] text-slate-700"
                        >
                          <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="break-all">{soItem}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-slate-400" />
                产品: <span className="text-slate-700 font-medium">{orderData.product} ({orderData.productCode})</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                数量: {orderData.qty} 台
              </span>
              <span className="text-slate-300">·</span>
              {/* 工单总体进度 */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">工单总体进度:</span>
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${orderData.overallProgress ?? 0}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-slate-700 text-[12px]">
                  {orderData.overallProgress ?? 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Anchor Tabs */}
      <div className="bg-white px-6 border-b border-slate-200 shrink-0 z-20">
        <div className="flex items-center gap-8 text-[14px]">
          {SECTION_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleAnchorClick(tab.id)}
              className={`py-3.5 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600 font-bold' 
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Unified Scrollable Content Area (All 5 Modules on Same Screen) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        className="flex-1 overflow-y-auto custom-scrollbar bg-white p-6 space-y-6 scroll-smooth"
      >
        {/* 1. 基本信息 */}
        <section
          ref={el => { sectionRefs.current.info = el; }}
          id="section-info"
          className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden scroll-mt-4"
        >
          <div
            onClick={() => toggleSectionCollapse('info')}
            className="px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50/40 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-[#1677ff] rounded-xs"></div>
              <h2 className="text-[15px] font-bold text-slate-800">基本信息</h2>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSectionCollapse('info');
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>{collapsedSections.info ? '展开' : '收起'}</span>
              {collapsedSections.info ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>

          {!collapsedSections.info && (
            <div className="px-5 py-4">
              <div className="flex flex-col lg:flex-row gap-5 items-start">
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-2.5">
                  {/* Row 1: 工单编码 | 工单类型 | 来源类型 */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">工单编码</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 font-mono truncate">
                      {orderData.no}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">工单类型</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 truncate">
                      {orderData.type || '成品自制'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">来源类型</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 truncate">
                      {orderData.so ? '客户订单' : '手工创建'}
                    </div>
                  </div>

                  {/* Row 2: 销售订单 | 项次 | 优先级 */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">销售订单</label>
                    <div className="relative group flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center justify-between gap-1.5 text-[12.5px] text-slate-700 font-mono">
                      <span className="truncate">{fullSalesOrderText}</span>
                      {salesOrderList.length > 1 && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-sans font-medium shrink-0">
                          共{salesOrderList.length}项
                        </span>
                      )}
                      <div className="hidden group-hover:block absolute left-0 top-full pt-1.5 z-40 min-w-[260px] max-w-full">
                        <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-xs text-slate-700 font-sans">
                          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                            <span className="font-bold text-slate-800">关联销售订单明细</span>
                            <span className="text-[11px] text-slate-400">共 {salesOrderList.length} 项</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {salesOrderList.map((soItem, idx) => (
                              <div key={idx} className="px-2 py-1 rounded bg-white border border-slate-200 shadow-2xs font-mono text-[12px] text-slate-700">
                                {soItem}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">项次</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 font-mono truncate">
                      {salesOrderList
                        .map(item => item.match(/第\s*(\d+)\s*项/)?.[1] || orderData.lineItem || '04')
                        .join('、')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">优先级</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 truncate">
                      {orderData.priority || '中'}
                    </div>
                  </div>

                  {/* Row 3: 产品名称 | 产品分类 | 规格型号 */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">产品名称</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 font-bold truncate" title={`${orderData.product} (${orderData.productCode})`}>
                      <span className="truncate">{orderData.product} ({orderData.productCode})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">产品分类</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 truncate">
                      成套设备
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">规格型号</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 font-mono truncate" title={orderData.spec || '2000×650×1800mm / 45#钢'}>
                      <span className="truncate">{orderData.spec || '2000×650×1800mm / 45#钢'}</span>
                    </div>
                  </div>

                  {/* Row 4: 产品数量 | 工艺路线 | 计划交货日期 */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">产品数量</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 font-mono font-bold truncate">
                      {orderData.qty} 台
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">工艺路线</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 truncate" title={`${orderData.product}标准工艺路线`}>
                      <span className="truncate">{orderData.product}标准工艺路线</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">计划交货日期</label>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded text-[12.5px] text-slate-700 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{orderData.plannedEnd}</span>
                    </div>
                  </div>

                  {/* Row 5: 所属公司 | 所属部门 | 计划起止日期 */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">所属公司</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-700 truncate" title="深圳智造精密科技有限公司">
                      <span className="truncate">深圳智造精密科技有限公司</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">所属部门</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-blue-700 font-medium truncate">
                      {orderData.department || '机加部'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">计划起止日期</label>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded text-[12.5px] text-slate-700 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{orderData.plannedStart} 至 {orderData.plannedEnd}</span>
                    </div>
                  </div>

                  {/* Row 6: 备注 (紧凑单行通栏) */}
                  <div className="flex items-center gap-2.5 md:col-span-3 min-w-0">
                    <label className="w-20 text-right text-[12.5px] text-slate-500 shrink-0">备注</label>
                    <div className="flex-1 min-w-0 h-8 px-2.5 bg-white border border-slate-200 shadow-2xs rounded flex items-center text-[12.5px] text-slate-600 truncate">
                      -
                    </div>
                  </div>
                </div>

                {/* Compact QR Code Card */}
                <div className="w-full lg:w-[136px] flex flex-col items-center shrink-0">
                  <span className="text-xs text-slate-500 mb-1.5 font-medium">工单二维码</span>
                  <div className="w-[132px] border border-slate-200 rounded-xl bg-white shadow-2xs p-2 flex flex-col items-center justify-between gap-1.5">
                    <div className="w-20 h-20 bg-white p-1 rounded-lg border border-slate-100 shadow-2xs flex items-center justify-center">
                      <QrCode className="w-full h-full text-slate-900" />
                    </div>
                    <div className="w-full flex flex-col items-center text-center">
                      <span className="font-mono text-[11px] font-bold text-slate-800 tracking-tight truncate max-w-full">
                        {orderData.no}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        车间扫码流转
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. BOM组成 */}
        <section
          ref={el => { sectionRefs.current.bom = el; }}
          id="section-bom"
          className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden scroll-mt-4"
        >
          <div
            onClick={() => toggleSectionCollapse('bom')}
            className="px-6 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-[#1677ff] rounded-xs"></div>
              <h2 className="text-[15px] font-bold text-slate-800">BOM组成</h2>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSectionCollapse('bom');
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>{collapsedSections.bom ? '展开' : '收起'}</span>
              {collapsedSections.bom ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>

          {!collapsedSections.bom && (
            <div className="p-10 flex flex-col items-center justify-center text-slate-400">
              <Box className="w-10 h-10 stroke-[1.2] mb-3 text-slate-300 opacity-60" />
              <p className="text-[13px] font-medium text-slate-500">暂无BOM数据</p>
            </div>
          )}
        </section>

        {/* 3. 工艺路线与工序 */}
        <section
          ref={el => { sectionRefs.current.routing = el; }}
          id="section-routing"
          className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden scroll-mt-4"
        >
          <div
            onClick={() => toggleSectionCollapse('routing')}
            className="px-6 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-[#1677ff] rounded-xs"></div>
              <h2 className="text-[15px] font-bold text-slate-800">工艺路线与工序</h2>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSectionCollapse('routing');
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>{collapsedSections.routing ? '展开' : '收起'}</span>
              {collapsedSections.routing ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>

          {!collapsedSections.routing && (
            <div className="flex min-h-[540px] bg-white overflow-hidden">
              {/* Left Split: 产品结构 (Product Structure Tree) */}
              <div
                className={`shrink-0 border-r border-slate-200 bg-white flex flex-col pt-4 overflow-hidden transition-all duration-300 ${
                  isRoutingSidebarOpen ? 'w-[300px]' : 'w-0 border-r-0'
                }`}
              >
                <div className="w-[300px] flex flex-col h-full">
                  <div className="px-4 pb-3 border-b border-slate-100 flex flex-col gap-2.5 mb-2 shrink-0">
                    <div className="flex items-center justify-between whitespace-nowrap">
                      <h3 className="text-[13px] font-bold text-slate-800 tracking-wide">
                        产品结构
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        点击切换查看工序
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 shadow-2xs">
                      <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <select
                        value={routingCategoryFilter}
                        onChange={(e) => setRoutingCategoryFilter(e.target.value)}
                        className="w-full text-xs bg-transparent text-slate-700 outline-none cursor-pointer font-medium"
                      >
                        <option value="全部">全部物料类型</option>
                        <option value="成品">成品</option>
                        <option value="半成品">半成品</option>
                        <option value="钣金件">钣金件</option>
                        <option value="机加件">机加件</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
                    <BomTree
                      node={productStructureTree}
                      activeNodeId={activeStructureNode.id}
                      onSelect={(id) => setActiveRoutingNodeId(id)}
                      checkedNodes={checkedRoutingNodes}
                      onCheckNode={(id, checked) => {
                        setCheckedRoutingNodes(prev => {
                          const next = new Set(prev);
                          if (checked) next.add(id);
                          else next.delete(id);
                          return next;
                        });
                      }}
                      hideCheckboxes={true}
                      categoryFilter={routingCategoryFilter}
                    />
                  </div>
                </div>
              </div>

              {/* Right Split: 对应产品工序列表 & 切换展示工序依赖 */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0 relative">
                {/* Sidebar Collapse/Expand Handle */}
                <button
                  type="button"
                  onClick={() => setIsRoutingSidebarOpen(!isRoutingSidebarOpen)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-4 h-12 bg-white border border-l-0 border-slate-200 rounded-r-md flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-xs"
                  title={isRoutingSidebarOpen ? '收起产品结构' : '展开产品结构'}
                >
                  {isRoutingSidebarOpen ? (
                    <ChevronLeft className="w-3 h-3 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                  )}
                </button>

                {/* Right Top Header: Selected Product Info + Sub-Tab Toggle (工序列表 / 工序依赖结构) */}
                <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <h3 className="text-sm md:text-base font-bold text-slate-900 font-mono tracking-tight truncate">
                      {activeStructureNode.code}{' '}
                      <span className="text-slate-300 font-light mx-1">|</span>{' '}
                      {activeStructureNode.name}
                    </h3>
                  </div>

                  {/* Tab Selector: 切换展示 工序列表 / 工序依赖结构 */}
                  <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setRoutingSubTab('list')}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        routingSubTab === 'list'
                          ? 'bg-blue-50 text-[#1677ff] border border-blue-200/80 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 border border-transparent'
                      }`}
                    >
                      工序列表
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoutingSubTab('dependency')}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        routingSubTab === 'dependency'
                          ? 'bg-blue-50 text-[#1677ff] border border-blue-200/80 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 border border-transparent'
                      }`}
                    >
                      工序依赖结构
                    </button>
                  </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 p-5 overflow-auto bg-white">
                  {routingSubTab === 'list' ? (
                    /* TAB 1: 对应产品工序列表 */
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-center border-collapse">
                          <thead>
                            <tr className="bg-white border-b border-slate-200 text-[13px] font-bold text-slate-700">
                              <th className="py-3.5 px-4 border-r border-slate-200/70 w-24">序号</th>
                              <th className="py-3.5 px-4 border-r border-slate-200/70">工序编码</th>
                              <th className="py-3.5 px-4 border-r border-slate-200/70">工序名称</th>
                              <th className="py-3.5 px-4 border-r border-slate-200/70">工作站</th>
                              <th className="py-3.5 px-4 border-r border-slate-200/70 w-32">工序类型</th>
                              <th className="py-3.5 px-4 border-r border-slate-200/70 w-36">报工方式</th>
                              <th className="py-3.5 px-4 border-r border-slate-200/70">备注</th>
                              <th className="py-3.5 px-4 w-24">启用</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 text-[13px] text-slate-700 bg-white">
                            {processRows.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-10 text-slate-400 text-xs">
                                  当前物料暂无工序列表数据
                                </td>
                              </tr>
                            ) : (
                              processRows.map((row) => {
                                const wsLabel = `${row.workStationCode} ${row.workStationName}`;
                                return (
                                  <tr
                                    key={row.id}
                                    className={`hover:bg-slate-50/40 transition-colors ${!row.enabled ? 'opacity-50' : ''}`}
                                  >
                                    <td className="py-3.5 px-4 border-r border-slate-100 font-mono text-slate-700">
                                      {row.seq}
                                    </td>
                                    <td className="py-3.5 px-4 border-r border-slate-100 font-mono text-slate-800">
                                      {row.opCode}
                                    </td>
                                    <td className="py-3.5 px-4 border-r border-slate-100 text-slate-800">
                                      {row.opName}
                                    </td>
                                    <td className="py-3.5 px-4 border-r border-slate-100">
                                      <span
                                        title={wsLabel}
                                        className="inline-block max-w-[180px] truncate px-3 py-1 rounded bg-white border border-slate-200 shadow-2xs text-slate-600 text-xs"
                                      >
                                        {wsLabel}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 border-r border-slate-100">
                                      <span
                                        className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                                          row.processType === '委外'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200/70'
                                            : 'bg-blue-50/80 text-[#1677ff] border border-blue-200/70'
                                        }`}
                                      >
                                        {row.processType}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 border-r border-slate-100">
                                      <span className="inline-block px-3.5 py-1 rounded bg-blue-50/80 text-[#1677ff] border border-blue-200/70 text-xs font-medium">
                                        {row.reportingMode}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 border-r border-slate-100 text-slate-500">
                                      {row.remark}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center justify-center">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleRowEnabled(row.id)}
                                          className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                                            row.enabled ? 'bg-[#7da8f5]' : 'bg-slate-200'
                                          }`}
                                        >
                                          <span
                                            className={`w-4 h-4 rounded-full bg-white shadow-xs absolute top-0.5 transition-all ${
                                              row.enabled ? 'right-0.5' : 'left-0.5'
                                            }`}
                                          />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* TAB 2: 工序依赖结构 */
                    <div className="flex flex-col lg:flex-row gap-4 items-stretch bg-white">
                      {/* Left Sub-Sidebar: 工序 */}
                      <div className="w-full lg:w-[240px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col">
                        <h3 className="text-[14px] font-bold text-slate-800 mb-3">工序</h3>

                        <div className="bg-white border border-slate-200 shadow-2xs rounded-lg p-3 flex items-start gap-2 text-xs text-slate-600 mb-3">
                          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            编辑状态可将工序卡片拖拽到右侧对应层级工序块中即可添加
                          </span>
                        </div>

                        <div className="relative mb-4">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={poolSearch}
                            onChange={(e) => setPoolSearch(e.target.value)}
                            placeholder="搜索工序编码或名称"
                            className="w-full h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 transition-colors"
                          />
                        </div>

                        <div className="flex-1 overflow-y-auto flex flex-col min-h-[220px]">
                          {unassignedProcesses.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8 select-none">
                              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                                <PackageOpen className="w-8 h-8 text-slate-300 stroke-[1.3]" />
                              </div>
                              <span className="text-[13px] text-slate-400">暂无未分配工序</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {unassignedProcesses.map((proc, idx) => (
                                <div
                                  key={proc.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', proc.opCode);
                                  }}
                                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-400 shadow-2xs flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all"
                                >
                                  <span className="w-6 h-6 rounded bg-slate-100 text-slate-600 text-xs font-medium flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-semibold text-slate-800 font-mono truncate">
                                      {proc.opCode}
                                    </span>
                                    <span className="text-xs text-slate-500 truncate mt-0.5">
                                      {proc.opName}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Sub-Panel: 工序依赖结构 */}
                      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-5">
                          <h3 className="text-[14px] font-bold text-slate-800">工序依赖结构</h3>
                          <span
                            title="同一工序块内工序为并行关系，不同工序块之间按设定的时序依赖关系依次流转"
                            className="w-4 h-4 rounded-full bg-[#1677ff] text-white text-[10px] font-bold flex items-center justify-center cursor-help"
                          >
                            !
                          </span>
                        </div>

                        <div className="flex flex-col">
                          {dependencyBlocks.map((block, blockIdx) => {
                            const isHovered = dragOverBlockId === block.id;
                            return (
                              <React.Fragment key={block.id}>
                                {blockIdx > 0 && (
                                  <div className="py-4 flex items-center justify-center gap-2 select-none">
                                    <ArrowDown className="w-4 h-4 text-slate-500" />
                                    <span className="px-3 py-1 rounded bg-white text-slate-700 text-xs font-medium border border-slate-200 shadow-2xs">
                                      {dependencyBlocks[blockIdx - 1].relationToNext}
                                    </span>
                                  </div>
                                )}

                                <div
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (dragOverBlockId !== block.id) setDragOverBlockId(block.id);
                                  }}
                                  onDragLeave={() => setDragOverBlockId(null)}
                                  onDrop={(e) => {
                                    setDragOverBlockId(null);
                                    const opCode = e.dataTransfer.getData('text/plain');
                                    handleDropToBlock(block.id, opCode);
                                  }}
                                  className={`rounded-xl p-5 transition-all border shadow-2xs ${
                                    isHovered
                                      ? 'bg-blue-50/40 border-blue-300 ring-2 ring-blue-100'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 mb-4">
                                    <span className="text-[13px] font-bold text-slate-800">
                                      {block.title}
                                    </span>
                                    <span className="text-xs text-[#1677ff] font-medium">
                                      并行组·{block.opCodes.length}道工序
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-4">
                                    {block.opCodes.map((code, cardIdx) => {
                                      const procDetail = processRows.find(r => r.opCode === code);
                                      return (
                                        <div
                                          key={code}
                                          draggable
                                          onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', code);
                                          }}
                                          className="w-[240px] bg-white border border-slate-200/80 hover:border-blue-300 rounded-lg px-4 py-3 shadow-2xs flex items-center gap-3.5 cursor-grab active:cursor-grabbing transition-all"
                                        >
                                          <span className="w-6 h-6 rounded bg-slate-100 text-slate-600 text-xs font-medium flex items-center justify-center shrink-0">
                                            {cardIdx + 1}
                                          </span>
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-[13px] font-medium text-slate-800 font-mono truncate">
                                              {code}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate mt-0.5">
                                              {procDetail?.opName || code}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. 排产计划 */}
        <section
          ref={el => { sectionRefs.current.schedule = el; }}
          id="section-schedule"
          className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden scroll-mt-4"
        >
          <div
            onClick={() => toggleSectionCollapse('schedule')}
            className="px-6 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-[#1677ff] rounded-xs"></div>
              <h2 className="text-[15px] font-bold text-slate-800">排产计划</h2>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSectionCollapse('schedule');
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>{collapsedSections.schedule ? '展开' : '收起'}</span>
              {collapsedSections.schedule ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>

          {!collapsedSections.schedule && (
            <div className="h-[520px] w-full overflow-hidden">
              <SchedulingPanel 
                bomData={bomData} 
                schedulePlanMap={schedulePlanMap} 
                onUpdateSchedulePlan={handleUpdateSchedulePlan} 
                setSchedulePlanMap={setSchedulePlanMap} 
                hideSidebar={true} 
                readOnly={true} 
              />
            </div>
          )}
        </section>

        {/* 5. 生产任务 */}
        <section
          ref={el => { sectionRefs.current.tasks = el; }}
          id="section-tasks"
          className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden scroll-mt-4"
        >
          <div
            onClick={() => toggleSectionCollapse('tasks')}
            className="px-6 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-[#1677ff] rounded-xs"></div>
              <h2 className="text-[15px] font-bold text-slate-800">生产任务</h2>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSectionCollapse('tasks');
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>{collapsedSections.tasks ? '展开' : '收起'}</span>
              {collapsedSections.tasks ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>

          {!collapsedSections.tasks && (
            <div className="h-[520px] w-full overflow-hidden">
              <TaskPanel 
                bomData={bomData} 
                schedulePlanMap={schedulePlanMap} 
                setSchedulePlanMap={setSchedulePlanMap}
                onUpdateSchedulePlan={handleUpdateSchedulePlan}
                defaultPriority="中" 
                readOnly={true} 
                onTaskClick={onTaskClick}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

