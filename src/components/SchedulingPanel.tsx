import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { initialBomCompositionList } from '../data';
import type { BomNode, SchedulePlanItem, Operation } from '../types';
import { cn } from '../lib/utils';
import { 
  Package, ChevronLeft, ChevronRight, Search, Scissors, Send, 
  Plus, Trash2, CheckCircle2, AlertCircle, RotateCcw,
  Layers, List, Sliders, ChevronDown, ChevronUp, Users, Sparkles, CalendarDays, MoreVertical, Info, X, HelpCircle, Filter
} from 'lucide-react';
import BomTree from './BomTree';

interface SchedulingPanelProps {
  readOnly?: boolean;
  bomData: BomNode;
  schedulePlanMap: Record<string, SchedulePlanItem>;
  onUpdateSchedulePlan: (nodeId: string, opId: string, updates: Partial<SchedulePlanItem>) => void;
  setSchedulePlanMap?: React.Dispatch<React.SetStateAction<Record<string, SchedulePlanItem>>>;
  hideSidebar?: boolean;
}

type TabType = 'PENDING' | 'SCHEDULED';
type ViewMode = 'FLAT' | 'AGGREGATED';

interface SplitRow {
  id: string;
  workCenterCode: string;
  workCenterName: string;
  equipmentName?: string;
  position: string;
  employee: string;
  quantity: number;
  plannedStartTime: string;
  estimatedEndTime: string;
  remark: string;
}

// Helper to flatten BOM tree nodes
const flattenBomNodes = (node: BomNode): BomNode[] => {
  return [node, ...(node.children || []).flatMap(flattenBomNodes)];
};

function SchedulingPanel({
  readOnly, 
  bomData, 
  schedulePlanMap, 
  onUpdateSchedulePlan,
  setSchedulePlanMap,
  hideSidebar = false
}: SchedulingPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('全部');
  const [viewMode, setViewMode] = useState<ViewMode>('FLAT');
  const [activeNodeId, setActiveNodeId] = useState<string>(bomData.id);
  const [checkedNodeIds, setCheckedNodeIds] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    setActiveNodeId(bomData.id);
    setCheckedNodeIds(new Set());
  }, [bomData.id]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPlanKeys, setSelectedPlanKeys] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set());
  const [actionMenuState, setActionMenuState] = useState<{
    key: string;
    node: BomNode;
    op: Operation;
    plan: SchedulePlanItem;
    top: number;
    left: number;
    openUpward: boolean;
  } | null>(null);
  const [notificationToast, setNotificationToast] = useState<{
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (notificationToast) {
      const timer = setTimeout(() => {
        setNotificationToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notificationToast]);

  const showNotificationToast = (toast: { type: 'success' | 'warning' | 'info'; title: string; message: string }) => {
    setNotificationToast(toast);
  };

  React.useEffect(() => {
    if (!actionMenuState) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.portal-action-menu') && !target.closest('.action-menu-trigger-btn')) {
        setActionMenuState(null);
      }
    };

    const handleScrollOrResize = () => {
      setActionMenuState(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [actionMenuState]);

  const handleToggleActionMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    key: string,
    node: BomNode,
    op: Operation,
    plan: SchedulePlanItem
  ) => {
    e.stopPropagation();
    if (actionMenuState?.key === key) {
      setActionMenuState(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = plan.isSplit ? 160 : (activeTab === 'PENDING' ? 95 : 55);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;
    
    const top = openUpward ? (rect.top - menuHeight - 4) : (rect.bottom + 4);
    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));

    setActionMenuState({
      key,
      node,
      op,
      plan,
      top,
      left,
      openUpward
    });
  };

  // Batch Edit Modal state
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState({
    employee: '',
    position: '',
    workCenterCode: '',
    workCenterName: '',
    plannedStartTime: '',
    estimatedEndTime: '',
    remark: ''
  });

  // Split Modal State
  const [splitModalItem, setSplitModalItem] = useState<{
    node: BomNode;
    op: Operation;
    parentPlanKey: string;
    totalDemand: number;
  } | null>(null);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  const [selectedSplitRowIds, setSelectedSplitRowIds] = useState<Set<string>>(new Set());

  // Get all flattened nodes
  const allNodes = useMemo(() => flattenBomNodes(bomData), [bomData]);

  // Handle tree node check toggle
  const handleCheckNode = (id: string, checked: boolean) => {
    setCheckedNodeIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAllMaterials = () => {
    setCheckedNodeIds(new Set(allNodes.map(n => n.id)));
  };

  const handleClearMaterialChecks = () => {
    setCheckedNodeIds(new Set());
  };

  // Determine displayed materials
  const targetNodes = useMemo(() => {
    if (checkedNodeIds.size > 0) {
      return allNodes.filter(n => checkedNodeIds.has(n.id));
    }
    const single = allNodes.find(n => n.id === activeNodeId);
    return single ? [single] : [bomData];
  }, [allNodes, checkedNodeIds, activeNodeId, bomData]);

  // Build full plan list for target materials
  const allTargetPlans = useMemo(() => {
    const list: Array<{
      key: string;
      node: BomNode;
      op: Operation;
      plan: SchedulePlanItem;
    }> = [];

    targetNodes.forEach(node => {
      const comp = initialBomCompositionList.find(c => c.materialCode === node.code);
      // Outsource operations are strictly excluded from scheduling
      const enabledOps = (node.operations || []).filter(op => op.isEnabled && op.executionType !== 'OUTSOURCE');

      enabledOps.forEach(op => {
        // Check if there are split items in schedulePlanMap for this node & op
        const splitKeys = Object.keys(schedulePlanMap).filter(
          k => k.startsWith(`${node.id}-${op.id}-split-`)
        );

        if (splitKeys.length > 0) {
          splitKeys.forEach(k => {
            const p = schedulePlanMap[k];
            if (p) {
              list.push({
                key: k,
                node,
                op,
                plan: p
              });
            }
          });
        } else {
          const key = `${node.id}-${op.id}`;
          const existing = schedulePlanMap[key];
          const plan: SchedulePlanItem = existing || {
            id: key,
            nodeId: node.id,
            opId: op.id,
            materialCode: node.code,
            materialName: node.name,
            opName: op.opName,
            stepIdx: op.stepIdx,
            scheduledQuantity: (node as any).quantity || comp?.totalDemand || 1,
            workCenterCode: op.workCenterCode || `WS-0${(op.stepIdx % 3) + 1}`,
            workCenterName: op.workCenter || `工作站0${(op.stepIdx % 3) + 1}`,
            position: '操作工',
            employee: op.stepIdx % 2 === 0 ? '张师傅' : '李师傅',
            plannedStartTime: '2026-06-10T08:00',
            estimatedEndTime: '2026-06-10T18:00',
            remark: op.remark || '',
            isScheduled: false,
          };
          list.push({ key, node, op, plan });
        }
      });
    });

    return list;
  }, [targetNodes, schedulePlanMap]);

  // Filter plans based on activeTab (PENDING vs SCHEDULED) & search
  const filteredPlans = useMemo(() => {
    return allTargetPlans.filter(item => {
      const isSched = !!item.plan.isScheduled;
      if (activeTab === 'PENDING' && isSched) return false;
      if (activeTab === 'SCHEDULED' && !isSched) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matMatch = item.node.name.toLowerCase().includes(term) || item.node.code.toLowerCase().includes(term);
        const opMatch = item.op.opName.toLowerCase().includes(term);
        const empMatch = (item.plan.employee || '').toLowerCase().includes(term);
        const wcMatch = (item.plan.workCenterName || '').toLowerCase().includes(term);
        if (!matMatch && !opMatch && !empMatch && !wcMatch) return false;
      }
      return true;
    });
  }, [allTargetPlans, activeTab, searchTerm]);

  // Grouped Operations for Batch Scheduling across Multiple Materials
  const groupedOps = useMemo(() => {
    const map = new Map<string, {
      opName: string;
      items: Array<{ key: string; node: BomNode; op: Operation; plan: SchedulePlanItem }>;
      presentMaterials: BomNode[];
      missingMaterials: BomNode[];
      totalDemandSum: number;
    }>();

    // Group items by operation name
    filteredPlans.forEach(item => {
      const name = item.op.opName;
      if (!map.has(name)) {
        map.set(name, {
          opName: name,
          items: [],
          presentMaterials: [],
          missingMaterials: [],
          totalDemandSum: 0
        });
      }
      const entry = map.get(name)!;
      entry.items.push(item);
      if (!entry.presentMaterials.some(m => m.id === item.node.id)) {
        entry.presentMaterials.push(item.node);
      }
      entry.totalDemandSum += item.plan.scheduledQuantity;
    });

    // Determine missing materials per operation
    const result: Array<{
      opName: string;
      items: Array<{ key: string; node: BomNode; op: Operation; plan: SchedulePlanItem }>;
      presentMaterials: BomNode[];
      missingMaterials: BomNode[];
      totalDemandSum: number;
      uniqueMaterialCount: number;
      totalTargetCount: number;
      isUniversal: boolean;
      isPartial: boolean;
      samplePlan: SchedulePlanItem;
    }> = [];

    map.forEach((value, opName) => {
      const presentIds = new Set(value.presentMaterials.map(m => m.id));
      const missing = targetNodes.filter(n => !presentIds.has(n.id));
      const uniqueMatCount = value.presentMaterials.length;
      const totalTargetCount = targetNodes.length;

      // First plan as default representative sample
      const samplePlan = value.items[0]?.plan || {
        workCenterCode: '',
        workCenterName: '',
        position: '操作工',
        employee: '',
        plannedStartTime: '2026-06-10T08:00',
        estimatedEndTime: '2026-06-10T18:00',
        remark: ''
      } as SchedulePlanItem;

      result.push({
        ...value,
        missingMaterials: missing,
        uniqueMaterialCount: uniqueMatCount,
        totalTargetCount: totalTargetCount,
        isUniversal: uniqueMatCount === totalTargetCount,
        isPartial: uniqueMatCount < totalTargetCount,
        samplePlan
      });
    });

    return result;
  }, [filteredPlans, targetNodes]);

  // Update a plan item
  const updatePlanItem = (key: string, updates: Partial<SchedulePlanItem>) => {
    if (setSchedulePlanMap) {
      setSchedulePlanMap(prev => {
        const existing = prev[key] || allTargetPlans.find(i => i.key === key)?.plan || {
          id: key,
          nodeId: key.split('-')[0],
          opId: key.split('-')[1],
          scheduledQuantity: 1,
        };
        return {
          ...prev,
          [key]: { ...existing, ...updates }
        };
      });
    } else {
      const parts = key.split('-');
      onUpdateSchedulePlan(parts[0], parts[1], updates);
    }
  };

  // Batch update all items matching an operation name
  const updateBatchOperation = (opName: string, updates: Partial<SchedulePlanItem>) => {
    if (setSchedulePlanMap) {
      setSchedulePlanMap(prev => {
        const next = { ...prev };
        const matchingItems = allTargetPlans.filter(item => item.op.opName === opName);
        matchingItems.forEach(item => {
          const existing = next[item.key] || item.plan;
          next[item.key] = { ...existing, ...updates };
        });
        return next;
      });
    }
  };

  // Batch action (Confirm or Unschedule) for a grouped operation across all materials
  const handleBatchToggleGroupedOperation = (opName: string, toScheduled: boolean) => {
    updateBatchOperation(opName, { isScheduled: toScheduled });
  };

  // Helper to determine if a plan item's task is already dispatched
  const isPlanDispatched = (plan: SchedulePlanItem, key: string): boolean => {
    if (plan.isDispatched !== undefined) {
      return !!plan.isDispatched;
    }
    const parts = key.split('-');
    const nodeId = plan.nodeId || parts[0];
    const opId = plan.opId || parts[1];
    const nodeIdx = allNodes.findIndex(n => n.id === nodeId);
    const targetNode = allNodes[nodeIdx >= 0 ? nodeIdx : 0];
    const opIdx = (targetNode?.operations || []).findIndex(o => o.id === opId);
    const subMatch = key.match(/-split-(\d+)$/);
    const subIdx = subMatch ? parseInt(subMatch[1], 10) : 0;
    
    return ((Math.max(0, nodeIdx) + Math.max(0, opIdx) + subIdx) % 3 !== 0);
  };

  // Confirm schedule single item
  const handleConfirmScheduleSingle = (key: string, opName?: string) => {
    updatePlanItem(key, { isScheduled: true });
    setSelectedPlanKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    showNotificationToast({
      type: 'success',
      title: '操作成功',
      message: `工序「${opName || '所选工序'}」已成功生成任务。`
    });
  };

  // Cancel schedule single item (with task dispatch validation)
  const handleCancelPlanSingle = (key: string, plan: SchedulePlanItem, opName?: string) => {
    const dispatched = isPlanDispatched(plan, key);
    if (dispatched) {
      showNotificationToast({
        type: 'warning',
        title: '不允许取消计划',
        message: `工序「${opName || plan.opName || '当前工序'}」对应的生产任务已下发执行，不允许取消计划！`
      });
      return;
    }

    updatePlanItem(key, { isScheduled: false, isDispatched: false });
    setSelectedPlanKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    showNotificationToast({
      type: 'success',
      title: '已取消排产计划',
      message: `工序「${opName || plan.opName || '当前工序'}」已撤回至「待排产计划」，关联的待下发生产任务已自动移除。`
    });
  };

  // Batch action (Confirm or Cancel Schedule) for selected check rows
  const handleBatchToggleSchedule = (toScheduled: boolean) => {
    if (selectedPlanKeys.size === 0) return;
    
    if (toScheduled) {
      if (setSchedulePlanMap) {
        setSchedulePlanMap(prev => {
          const next = { ...prev };
          selectedPlanKeys.forEach(key => {
            const existing = next[key] || allTargetPlans.find(i => i.key === key)?.plan || {
              id: key,
              nodeId: key.split('-')[0],
              opId: key.split('-')[1],
              scheduledQuantity: 1,
            };
            next[key] = { ...existing, isScheduled: true };
          });
          return next;
        });
      }
      showNotificationToast({
        type: 'success',
        title: '批量排产成功',
        message: `已批量确认 ${selectedPlanKeys.size} 项工序排产，并同步生成对应的生产任务。`
      });
      setSelectedPlanKeys(new Set());
    } else {
      const selectedList = Array.from(selectedPlanKeys).map((key: string) => {
        const plan = schedulePlanMap[key] || allTargetPlans.find(i => i.key === key)?.plan;
        return { key, plan: plan || { id: key, nodeId: key.split('-')[0], opId: key.split('-')[1], scheduledQuantity: 1 } };
      });

      const dispatchedItems = selectedList.filter(item => isPlanDispatched(item.plan, item.key));
      const undispatchedItems = selectedList.filter(item => !isPlanDispatched(item.plan, item.key));

      if (undispatchedItems.length === 0) {
        showNotificationToast({
          type: 'warning',
          title: '无法取消排产计划',
          message: '所选的排产计划关联的生产任务均已下发执行，不允许取消计划！'
        });
        return;
      }

      if (setSchedulePlanMap) {
        setSchedulePlanMap(prev => {
          const next = { ...prev };
          undispatchedItems.forEach(({ key, plan }) => {
            const existing = next[key] || plan;
            next[key] = { ...existing, isScheduled: false, isDispatched: false };
          });
          return next;
        });
      }

      if (dispatchedItems.length > 0) {
        showNotificationToast({
          type: 'warning',
          title: '部分计划已取消',
          message: `已成功取消 ${undispatchedItems.length} 项待下发计划并撤回待排产；另有 ${dispatchedItems.length} 项已下发生产任务的计划不可取消。`
        });
      } else {
        showNotificationToast({
          type: 'success',
          title: '已取消排产计划',
          message: `已成功取消 ${undispatchedItems.length} 项排产计划并撤回待排产列表，关联的待下发生产任务已自动移除。`
        });
      }

      setSelectedPlanKeys(new Set());
    }
  };

  // Determine if multi-selection state is active for materials
  const isMultiMaterialSelected = checkedNodeIds.size > 1;

  // Batch schedule all processes for checked materials (Material-level multi-select)
  const handleBatchMaterialSchedulingPlan = () => {
    if (checkedNodeIds.size <= 1) return;

    const checkedNodes = allNodes.filter(n => checkedNodeIds.has(n.id));
    const keysToSchedule = new Set<string>();

    checkedNodes.forEach(node => {
      const comp = initialBomCompositionList.find(c => c.materialCode === node.code);
      const enabledOps = (node.operations || []).filter(op => op.isEnabled && op.executionType !== 'OUTSOURCE');
      
      enabledOps.forEach(op => {
        const splitKeys = Object.keys(schedulePlanMap).filter(k => k.startsWith(`${node.id}-${op.id}-split-`));
        if (splitKeys.length > 0) {
          splitKeys.forEach(k => keysToSchedule.add(k));
        } else {
          keysToSchedule.add(`${node.id}-${op.id}`);
        }
      });
    });

    if (keysToSchedule.size === 0) {
      showNotificationToast({
        type: 'warning',
        title: '未找到可排产工序',
        message: '所选物料暂无生效的生产工序。'
      });
      return;
    }

    if (setSchedulePlanMap) {
      setSchedulePlanMap(prev => {
        const next = { ...prev };
        keysToSchedule.forEach(key => {
          const parts = key.split('-');
          const nodeId = parts[0];
          const opId = parts[1];
          const node = checkedNodes.find(n => n.id === nodeId);
          const op = node?.operations?.find(o => o.id === opId);
          const comp = node ? initialBomCompositionList.find(c => c.materialCode === node.code) : null;

          const existing = next[key] || {
            id: key,
            nodeId: nodeId,
            opId: opId,
            materialCode: node?.code || '',
            materialName: node?.name || '',
            opName: op?.opName || '',
            stepIdx: op?.stepIdx || 1,
            scheduledQuantity: (node as any)?.quantity || comp?.totalDemand || 1,
            workCenterCode: op?.workCenterCode || 'WS-01',
            workCenterName: op?.workCenter || '工作站01',
            position: '操作工',
            employee: '张师傅',
            plannedStartTime: '2026-06-10T08:00',
            estimatedEndTime: '2026-06-10T18:00',
            remark: op?.remark || '',
            isScheduled: false,
          };
          next[key] = { ...existing, isScheduled: true, isDispatched: true };
        });
        return next;
      });
    }

    showNotificationToast({
      type: 'success',
      title: '物料批量排产计划已下发',
      message: `已成功对勾选的 ${checkedNodeIds.size} 个物料/产品（共包含 ${keysToSchedule.size} 项全部工序）直接下发排产计划！`
    });
  };

  // Apply batch modal fields to selected rows
  const handleApplyBatchEditModal = () => {
    if (selectedPlanKeys.size === 0) return;

    const updates: Partial<SchedulePlanItem> = {};
    if (batchEditForm.employee) updates.employee = batchEditForm.employee;
    if (batchEditForm.position) updates.position = batchEditForm.position;
    if (batchEditForm.workCenterCode) updates.workCenterCode = batchEditForm.workCenterCode;
    if (batchEditForm.workCenterName) updates.workCenterName = batchEditForm.workCenterName;
    if (batchEditForm.equipmentName !== undefined) updates.equipmentName = batchEditForm.equipmentName;
    if (batchEditForm.plannedStartTime) updates.plannedStartTime = batchEditForm.plannedStartTime;
    if (batchEditForm.estimatedEndTime) updates.estimatedEndTime = batchEditForm.estimatedEndTime;
    if (batchEditForm.remark) updates.remark = batchEditForm.remark;

    if (setSchedulePlanMap) {
      setSchedulePlanMap(prev => {
        const next = { ...prev };
        selectedPlanKeys.forEach(key => {
          const existing = next[key] || allTargetPlans.find(i => i.key === key)?.plan || {
            id: key,
            nodeId: key.split('-')[0],
            opId: key.split('-')[1],
            scheduledQuantity: 1,
          };
          next[key] = { ...existing, ...updates };
        });
        return next;
      });
    }

    setIsBatchEditModalOpen(false);
  };

  // Open Split Modal
  const handleOpenSplitModal = (node: BomNode, op: Operation, parentPlanKey: string, currentQty: number) => {
    const totalDemand = currentQty > 0 ? currentQty : (initialBomCompositionList.find(c => c.materialCode === node.code)?.totalDemand || 1);
    if (totalDemand <= 1) return;

    setSplitModalItem({
      node,
      op,
      parentPlanKey,
      totalDemand,
    });
    setSelectedSplitRowIds(new Set());

    if (totalDemand >= 3) {
      const q1 = Math.floor(totalDemand * 0.4) || 1;
      const q2 = totalDemand - q1;
      setSplitRows([
        {
          id: '1',
          workCenterCode: op.workCenterCode || 'WS-01',
          workCenterName: `${op.workCenter || "工作站"}A线`,
          equipmentName: "设备1#",
          position: '操作工',
          employee: '张师傅',
          quantity: q1,
          plannedStartTime: '2026-06-10T08:00',
          estimatedEndTime: '2026-06-10T18:00',
          remark: 'A线分排'
        },
        {
          id: '2',
          workCenterCode: op.workCenterCode || 'WS-02',
          workCenterName: `${op.workCenter || "工作站"}B线`,
          equipmentName: "设备2#",
          position: '操作工',
          employee: '李师傅',
          quantity: q2,
          plannedStartTime: '2026-06-10T08:00',
          estimatedEndTime: '2026-06-10T18:00',
          remark: 'B线分排'
        }
      ]);
    } else {
      setSplitRows([
        {
          id: '1',
          workCenterCode: op.workCenterCode || 'WS-01',
          workCenterName: `${op.workCenter || "工作站"}A线`,
          equipmentName: "设备1#",
          position: '操作工',
          employee: '张师傅',
          quantity: 1,
          plannedStartTime: '2026-06-10T08:00',
          estimatedEndTime: '2026-06-10T18:00',
          remark: '第一批'
        },
        {
          id: '2',
          workCenterCode: op.workCenterCode || 'WS-02',
          workCenterName: `${op.workCenter || "工作站"}B线`,
          equipmentName: "设备2#",
          position: '操作工',
          employee: '李师傅',
          quantity: totalDemand - 1 > 0 ? totalDemand - 1 : 1,
          plannedStartTime: '2026-06-10T08:00',
          estimatedEndTime: '2026-06-10T18:00',
          remark: '第二批'
        }
      ]);
    }
  };

  // Split modal selection handlers
  const handleToggleSplitRowSelect = (id: string) => {
    setSelectedSplitRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSplitRowsSelected = splitRows.length > 0 && splitRows.every(r => selectedSplitRowIds.has(r.id));

  const handleToggleSelectAllSplitRows = () => {
    if (isAllSplitRowsSelected) {
      setSelectedSplitRowIds(new Set());
    } else {
      setSelectedSplitRowIds(new Set(splitRows.map(r => r.id)));
    }
  };

  const handleBatchDeleteSplitRows = () => {
    if (selectedSplitRowIds.size === 0) return;
    const remaining = splitRows.filter(r => !selectedSplitRowIds.has(r.id));
    if (remaining.length === 0) {
      const defaultRow: SplitRow = {
        id: Date.now().toString(),
        workCenterCode: splitModalItem?.op.workCenterCode || 'WS-01',
        workCenterName: "工作站A线",
        equipmentName: "设备1#",
        position: '操作工',
        employee: '作业员',
        quantity: 1,
        plannedStartTime: '2026-06-10',
        estimatedEndTime: '2026-06-10',
        remark: ''
      };
      setSplitRows([defaultRow]);
    } else {
      setSplitRows(remaining);
    }
    setSelectedSplitRowIds(new Set());
  };

  // Confirm Split Action
  const handleConfirmSplit = () => {
    if (!splitModalItem || !setSchedulePlanMap) return;

    const { node, op, parentPlanKey } = splitModalItem;

    setSchedulePlanMap(prev => {
      const next = { ...prev };
      
      // Delete original single plan item if it exists
      delete next[`${node.id}-${op.id}`];

      // Remove existing split keys for this node and op
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${node.id}-${op.id}-split-`)) {
          delete next[k];
        }
      });

      // Insert new split plan items
      splitRows.forEach((row, idx) => {
        const splitKey = `${node.id}-${op.id}-split-${idx + 1}`;
        next[splitKey] = {
          id: splitKey,
          nodeId: node.id,
          opId: op.id,
          materialCode: node.code,
          materialName: node.name,
          opName: op.opName,
          stepIdx: op.stepIdx,
          scheduledQuantity: Number(row.quantity) || 1,
          workCenterCode: row.workCenterCode || op.workCenterCode || '',
          workCenterName: row.workCenterName || op.workCenter || "",
          equipmentName: row.equipmentName || "",
          position: row.position || '操作工',
          employee: row.employee || '',
          plannedStartTime: row.plannedStartTime || '2026-06-10T08:00',
          estimatedEndTime: row.estimatedEndTime || '2026-06-10T18:00',
          remark: row.remark || '',
          isScheduled: activeTab === 'SCHEDULED',
          isSplit: true,
          parentPlanId: parentPlanKey,
          subTag: `${row.workCenterName} (${row.quantity}台)`
        };
      });

      return next;
    });

    setSplitModalItem(null);
  };

  const handleDeleteSplitPlan = (key: string) => {
    if (setSchedulePlanMap) {
      setSchedulePlanMap(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setSelectedPlanKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  // Selection logic for operation table
  const isAllOpsSelected = filteredPlans.length > 0 && filteredPlans.every(p => selectedPlanKeys.has(p.key));

  const toggleSelectAllOps = () => {
    if (isAllOpsSelected) {
      setSelectedPlanKeys(new Set());
    } else {
      setSelectedPlanKeys(new Set(filteredPlans.map(p => p.key)));
    }
  };

  const toggleSelectOp = (key: string) => {
    setSelectedPlanKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpandOp = (opName: string) => {
    setExpandedOps(prev => {
      const next = new Set(prev);
      if (next.has(opName)) next.delete(opName);
      else next.add(opName);
      return next;
    });
  };

  const pendingCount = allTargetPlans.filter(i => !i.plan.isScheduled).length;
  const scheduledCount = allTargetPlans.filter(i => !!i.plan.isScheduled).length;

  return (
    <div className="flex w-full h-full min-h-0 bg-white relative">
      {/* Left Split: BOM Tree & Material Selection */}
      <div className={cn("shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col pt-4 overflow-hidden transition-all duration-300", isSidebarOpen ? "w-[320px]" : "w-0 border-r-0")}>
        <div className="w-[320px] flex flex-col h-full">
          <div className="px-3 pb-3 mb-2 border-b border-slate-200/60 shrink-0 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-sm font-bold text-slate-800 shrink-0">排产计划</h2>

                {/* 批量排产计划 按钮 (位于标题右边，针对物料整体) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    disabled={!isMultiMaterialSelected}
                    onClick={handleBatchMaterialSchedulingPlan}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold rounded transition-all cursor-pointer",
                      isMultiMaterialSelected
                        ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                    )}
                    title={isMultiMaterialSelected ? `点击直接对已勾选的 ${checkedNodeIds.size} 个物料全部工序下发排产计划` : "请在下方勾选2个及以上物料时开启"}
                  >
                    <span>批量排产计划</span>
                    {isMultiMaterialSelected && (
                      <span className="bg-white/20 text-white text-[9px] px-1 rounded-full font-mono font-bold leading-none">
                        {checkedNodeIds.size}
                      </span>
                    )}
                  </button>

                  {/* 问号图标与 hover 提示语 */}
                  <div className="relative group flex items-center shrink-0">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-blue-600 cursor-help transition-colors" />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden group-hover:flex flex-col items-center z-[100] pointer-events-none w-max">
                      <div className="w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-800 -mb-px"></div>
                      <div className="bg-slate-800 text-white text-[11px] px-2.5 py-1 rounded shadow-lg whitespace-nowrap">
                        对选中物料待排产工序生成生产任务。
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] shrink-0">
                 <button 
                   onClick={handleSelectAllMaterials}
                   className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                 >
                   全选
                 </button>
                 <span className="text-slate-300">|</span>
                 <button 
                   onClick={handleClearMaterialChecks}
                   className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                 >
                   重置
                 </button>
              </div>
            </div>

            {/* 物料分类筛选下拉框 */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-1 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={materialCategoryFilter}
                onChange={(e) => setMaterialCategoryFilter(e.target.value)}
                className="w-full text-xs bg-transparent text-slate-700 outline-none cursor-pointer font-medium"
              >
                <option value="全部">全部物料分类</option>
                <option value="成品">成品</option>
                <option value="半成品">半成品</option>
                <option value="钣金件">钣金件</option>
                <option value="机加件">机加件</option>
                <option value="自制件">自制件</option>
                <option value="采购件">采购件</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <BomTree 
              node={bomData} 
              activeNodeId={activeNodeId} 
              onSelect={setActiveNodeId} 
              checkedNodes={checkedNodeIds}
              onCheckNode={handleCheckNode}
              hideCheckboxes={false}
              categoryFilter={materialCategoryFilter}
            />
          </div>
        </div>
      </div>

      {/* Right Split: Scheduling Editor */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {/* Float Notification Toast */}
        {notificationToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-300 max-w-lg w-full px-4 pointer-events-auto">
            <div className={cn(
              "p-3.5 rounded-xl shadow-lg border flex items-start gap-3 text-xs bg-white",
              notificationToast.type === 'warning' && "border-amber-300 bg-amber-50/95 text-amber-950 shadow-amber-100/50",
              notificationToast.type === 'success' && "border-emerald-300 bg-emerald-50/95 text-emerald-950 shadow-emerald-100/50",
              notificationToast.type === 'info' && "border-blue-300 bg-blue-50/95 text-blue-950 shadow-blue-100/50"
            )}>
              {notificationToast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
              {notificationToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {notificationToast.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] leading-tight mb-0.5">{notificationToast.title}</div>
                <div className="text-slate-600 leading-relaxed">{notificationToast.message}</div>
              </div>
              <button 
                onClick={() => setNotificationToast(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {!hideSidebar && (
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-4 h-12 bg-white border border-l-0 border-slate-200 rounded-r-md flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-sm transition-all"
          >
            {isSidebarOpen ? <ChevronLeft className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
          </button>
        )}

        {/* Status Sub-Banner & Actions */}
        {!readOnly && (
          <div className="px-6 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600 shrink-0">
             <div className="flex items-center gap-3">
                <span>已选排产物料: </span>
                {checkedNodeIds.size > 0 ? (
                   <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                     已勾选 {checkedNodeIds.size} 个物料节点 ({targetNodes.map(n => n.name).slice(0, 3).join(', ')}{targetNodes.length > 3 ? '...' : ''})
                   </span>
                ) : (
                   <span className="font-bold text-slate-800">{targetNodes[0]?.name} <span className="font-mono text-slate-400">({targetNodes[0]?.code})</span></span>
                )}
             </div>

             <div className="flex items-center gap-4">
                {selectedPlanKeys.size > 0 && (
                  <button
                    onClick={() => handleBatchToggleSchedule(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded shadow-xs hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    批量生成任务 ({selectedPlanKeys.size})
                  </button>
                )}

                 {viewMode === 'AGGREGATED' ? (
                  <div className="text-slate-500 flex items-center gap-2">
                    <span>包含 <strong className="text-blue-700 font-bold">{groupedOps.length}</strong> 种工序类型</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-amber-800 font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      修改工序自动对多物料生效
                    </span>
                  </div>
                ) : (
                  <div>
                     当前 <span className="font-bold text-blue-600">{filteredPlans.length}</span> 道工序可排产编辑
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Table Area */}
        <div className="flex-1 overflow-auto bg-slate-50/40 relative p-6">
          {viewMode === 'AGGREGATED' ? (
            /* ========================================================================= */
            /* Aggregated Batch Scheduling View (按工序聚合批量排产视角)                  */
            /* ========================================================================= */
            <div className="space-y-4">
              {groupedOps.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
                   <Package className="w-10 h-10 opacity-20 mx-auto mb-3" />
                   <p className="text-sm">{activeTab === 'PENDING' ? '暂无待排产规划工序' : '暂无已规划排产工序'}</p>
                </div>
              ) : (
                groupedOps.map((grp) => {
                  const isExpanded = expandedOps.has(grp.opName);
                  const samplePlan = grp.items[0]?.plan;

                  return (
                    <div 
                      key={grp.opName} 
                      className={cn(
                        "bg-white border rounded-xl shadow-xs overflow-hidden transition-all",
                        grp.isPartial ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200 hover:border-blue-300"
                      )}
                    >
                      {/* Operation Group Bar */}
                      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                           <button 
                             onClick={() => toggleExpandOp(grp.opName)}
                             className="p-1 hover:bg-slate-200 rounded text-slate-500 transition cursor-pointer"
                             title="展开/折叠包含物料明细"
                           >
                             {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </button>

                           <div className="flex items-center gap-2">
                             <span className="text-base font-bold text-slate-800">{grp.opName}</span>

                             {/* Coverage Badge */}
                             {grp.isUniversal ? (
                               <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                 <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                 全通用 ({grp.uniqueMaterialCount}/{grp.totalTargetCount} 物料)
                               </span>
                             ) : (
                               <div className="flex items-center gap-1.5">
                                 <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                                   <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                   少量物料/部分物料特有 ({grp.uniqueMaterialCount}/{grp.totalTargetCount} 物料包含)
                                 </span>
                               </div>
                             )}
                           </div>
                        </div>

                        {/* Batch Action For This Grouped Op */}
                        <div className="flex items-center gap-3 text-xs">
                          <button
                            onClick={() => toggleExpandOp(grp.opName)}
                            className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>{isExpanded ? '收起物料明细' : '查看物料分布明细'}</span>
                            <span className="text-slate-400 font-mono">({grp.items.length}项)</span>
                          </button>

                          <span className="text-slate-300">|</span>

                          {activeTab === 'PENDING' ? (
                            <button
                              onClick={() => handleBatchToggleGroupedOperation(grp.opName, true)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              一键批量生成任务 ({grp.items.length})
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBatchToggleGroupedOperation(grp.opName, false)}
                              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              批量重新排产 ({grp.items.length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Material Coverage Breakdown Panel (When Partial or Expanded) */}
                      {grp.isPartial && (
                        <div className="px-5 py-2.5 bg-amber-50/60 border-b border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-amber-900 shrink-0">包含物料 ({grp.presentMaterials.length}):</span>
                            {grp.presentMaterials.map(m => (
                              <span key={m.id} className="bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded font-medium">
                                {m.name} ({m.code})
                              </span>
                            ))}
                          </div>
                          {grp.missingMaterials.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap text-slate-500">
                              <span className="font-medium shrink-0 text-slate-400">未包含物料 ({grp.missingMaterials.length}):</span>
                              {grp.missingMaterials.map(m => (
                                <span key={m.id} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded line-through opacity-70">
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Separated Operational Parameter Input Bar */}
                      <div className="p-4 bg-white border-b border-slate-100 flex flex-col gap-3 text-xs">
                        {/* Section Header */}
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-100 pb-2">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <Sliders className="w-3.5 h-3.5 text-blue-600" />
                            工序批量配置栏 (按维度独立设置)
                          </span>
                          <span className="text-slate-400 font-normal">
                            时间与工作站可统一批量分配，各物料具体需求排产量在明细中独立配置
                          </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                          {/* Block 1: Resource & Work Center Assignment (5 cols) */}
                          <div className="lg:col-span-5 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 flex flex-col justify-between">
                            <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1">
                              <Users className="w-3 h-3 text-blue-600" />
                              班组与工作站分配 (批量)
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-0.5">工作站编码</label>
                                <input 
                                  type="text" 
                                  value={samplePlan?.workCenterCode || ''} 
                                  onChange={(e) => updateBatchOperation(grp.opName, { workCenterCode: e.target.value })}
                                  placeholder="WS-01"
                                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white focus:border-blue-500 outline-none transition font-mono text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-0.5">工作站名称</label>
                                <input 
                                  type="text" 
                                  value={samplePlan?.workCenterName || ''} 
                                  onChange={(e) => updateBatchOperation(grp.opName, { workCenterName: e.target.value })}
                                  placeholder="焊接工作站"
                                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white focus:border-blue-500 outline-none transition text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-0.5 mt-2">设备</label>
                                <input 
                                  type="text" 
                                  value={samplePlan?.equipmentName || ''} 
                                  onChange={(e) => updateBatchOperation(grp.opName, { equipmentName: e.target.value })}
                                  placeholder="选择/输入设备"
                                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white focus:border-blue-500 outline-none transition text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-0.5">岗位</label>
                                <input 
                                  type="text" 
                                  value={samplePlan?.position || '操作工'} 
                                  onChange={(e) => updateBatchOperation(grp.opName, { position: e.target.value })}
                                  placeholder="操作工"
                                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white focus:border-blue-500 outline-none transition text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-blue-700 font-bold mb-0.5">指派员工</label>
                                <input 
                                  type="text" 
                                  value={samplePlan?.employee || ''} 
                                  onChange={(e) => updateBatchOperation(grp.opName, { employee: e.target.value })}
                                  placeholder="指派人员"
                                  className="w-full px-2 py-1 border border-blue-300 bg-blue-50/50 text-blue-700 font-bold rounded focus:bg-white focus:border-blue-500 outline-none transition text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Block 2: Timeline Scheduling (4 cols) */}
                          <div className="lg:col-span-4 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100 flex flex-col justify-between">
                            <div className="text-[11px] font-bold text-indigo-900 mb-2 flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-indigo-600" />
                              工期计划时间 (时间维度)
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-indigo-700 mb-0.5">计划开始时间</label>
                                <input 
                                  type="date" 
                                  value={samplePlan?.plannedStartTime ? samplePlan.plannedStartTime.split('T')[0] : ''} 
                                  onChange={(e) => updateBatchOperation(grp.opName, { plannedStartTime: e.target.value })}
                                  className="w-full px-2 py-1 border border-indigo-200 rounded bg-white focus:border-indigo-500 outline-none transition text-slate-700 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-indigo-700 mb-0.5">预计完成时间</label>
                                <input 
                                  type="date" 
                                  value={samplePlan?.estimatedEndTime ? samplePlan.estimatedEndTime.split('T')[0] : ''} 
                                  onChange={(e) => updateBatchOperation(grp.opName, { estimatedEndTime: e.target.value })}
                                  className="w-full px-2 py-1 border border-indigo-200 rounded bg-white focus:border-indigo-500 outline-none transition text-slate-700 text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Block 3: Demand Quantities (3 cols - distinct & separate) */}
                          <div className="lg:col-span-3 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100 flex flex-col justify-between">
                            <div className="text-[11px] font-bold text-emerald-900 mb-1 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3 text-emerald-600" />
                                物料需求排产总量
                              </span>
                              <span className="text-[10px] text-emerald-700 bg-white border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                                独立数量维度
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <div className="text-xl font-bold font-mono text-emerald-800">
                                {grp.totalDemandSum} <span className="text-xs font-normal text-emerald-600">台</span>
                              </div>
                              <div className="text-[10px] text-emerald-700 text-right leading-tight max-w-[130px]">
                                各物料需求排产量独立，不与时间合并强行覆盖
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Per-Material Breakdown Table */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                          <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                            <span>所属物料工序平铺明细 ({grp.items.length} 个项目):</span>
                            <span className="text-[11px] text-blue-600 font-medium">支持对单一物料单独调整「计划开始/完成时间」与「排产数量」</span>
                          </h4>
                          <table className="w-full text-left text-xs border-collapse bg-white rounded border border-slate-200 overflow-hidden">
                            <thead className="bg-slate-100 text-slate-600 font-bold">
                              <tr>
                                <th className="p-2 border-b border-slate-200">物料信息</th>
                                <th className="p-2 border-b border-slate-200 text-center">工作站</th>
                                <th className="p-2 border-b border-slate-200 text-center">岗位</th>
                                <th className="p-2 border-b border-slate-200 text-center">员工</th>
                                <th className="p-2 border-b border-slate-200 text-center text-indigo-900 bg-indigo-50/50">计划开始时间</th>
                                <th className="p-2 border-b border-slate-200 text-center text-indigo-900 bg-indigo-50/50">预计完成时间</th>
                                <th className="p-2 border-b border-slate-200 text-center text-emerald-900 bg-emerald-50/50">需求排产数量</th>
                                <th className="p-2 border-b border-slate-200 text-center">排产状态</th>
                                <th className="p-2 border-b border-slate-200 text-center">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {grp.items.map(({ key, node, op, plan }) => (
                                <tr key={key} className="hover:bg-blue-50/30">
                                  <td className="p-2 font-medium text-slate-800">
                                    <div>{node.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{node.code}</div>
                                  </td>
                                  <td className="p-2 text-center text-slate-600">
                                    {plan.workCenterName || op.workCenter || '-'}
                                  </td>
                                  <td className="p-2 text-center text-slate-600">
                                    {plan.position || '操作工'}
                                  </td>
                                  <td className="p-2 text-center font-bold text-blue-700">
                                    <input 
                                      type="text" 
                                      value={plan.employee || ''} 
                                      onChange={(e) => updatePlanItem(key, { employee: e.target.value })}
                                      className="w-20 text-center border border-slate-200 rounded px-1.5 py-0.5 focus:border-blue-500 outline-none"
                                    />
                                  </td>
                                  {/* Independent Start Time per material */}
                                  <td className="p-2 text-center bg-indigo-50/20">
                                    <input 
                                      type="date" 
                                      value={plan.plannedStartTime ? plan.plannedStartTime.split('T')[0] : ''} 
                                      onChange={(e) => updatePlanItem(key, { plannedStartTime: e.target.value })}
                                      className="w-28 text-center text-[11px] border border-indigo-200 rounded px-1 py-0.5 bg-white focus:border-indigo-500 outline-none text-slate-700"
                                    />
                                  </td>
                                  {/* Independent End Time per material */}
                                  <td className="p-2 text-center bg-indigo-50/20">
                                    <input 
                                      type="date" 
                                      value={plan.estimatedEndTime ? plan.estimatedEndTime.split('T')[0] : ''} 
                                      onChange={(e) => updatePlanItem(key, { estimatedEndTime: e.target.value })}
                                      className="w-28 text-center text-[11px] border border-indigo-200 rounded px-1 py-0.5 bg-white focus:border-indigo-500 outline-none text-slate-700"
                                    />
                                  </td>
                                  {/* Independent Quantity per material */}
                                  <td className="p-2 text-center bg-emerald-50/20">
                                    <input 
                                      type="number" 
                                      value={plan.scheduledQuantity} 
                                      onChange={(e) => updatePlanItem(key, { scheduledQuantity: Math.max(1, parseInt(e.target.value) || 0) })}
                                      className="w-20 text-center font-bold font-mono text-emerald-800 border border-emerald-300 bg-white rounded px-1.5 py-0.5 outline-none focus:border-emerald-500"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    {plan.isScheduled ? (
                                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">已规划</span>
                                    ) : (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">未规划</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                        onClick={() => handleOpenSplitModal(node, op, key, plan.scheduledQuantity)}
                                        disabled={plan.scheduledQuantity <= 1}
                                        className={cn(
                                          "font-medium text-xs flex items-center gap-1 transition-colors",
                                          plan.scheduledQuantity <= 1
                                            ? "text-slate-300 cursor-not-allowed opacity-60"
                                            : "text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                                        )}
                                        title={plan.scheduledQuantity <= 1 ? "计划排产数量为1，不允许拆分任务" : "对该任务按人员/工作站拆分分排"}
                                      >
                                        <Scissors className="w-3.5 h-3.5" />
                                        任务拆分
                                      </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* Flat Detailed View (明细平铺视角)                                          */
            /* ========================================================================= */
            filteredPlans.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
                 <Package className="w-10 h-10 opacity-20 mx-auto mb-3" />
                 <p className="text-sm">{activeTab === 'PENDING' ? '暂无待排产计划' : '暂无已排产计划'}</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden min-w-max">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-xs border-b border-slate-200">
                      <tr className="text-[12px] font-bold text-slate-500 tracking-wider">
                        {!readOnly && (
                        <th className="px-3 py-3.5 text-center w-10">
                          <input 
                            type="checkbox" 
                            checked={isAllOpsSelected} 
                            onChange={toggleSelectAllOps} 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                          />
                        </th>
                        )}
                        <th className="px-4 py-3.5 text-center">工序</th>
                        {!readOnly && <th className="px-4 py-3.5 text-center">物料信息</th>}
                        <th className="px-4 py-3.5 text-center">报工方式</th>
                        <th className="px-4 py-3.5 text-center">工作站编码</th>
                        <th className="px-4 py-3.5 text-center">工作站名称</th>
                        <th className="px-4 py-3.5 text-center">设备</th>
                        <th className="px-4 py-3.5 text-center">岗位</th>
                        <th className="px-4 py-3.5 text-center">员工</th>
                        <th className="px-4 py-3.5 text-center">计划排产数量</th>
                        <th className="px-4 py-3.5 text-center">已计划数量</th>
                        <th className="px-4 py-3.5 text-center">计划开始时间</th>
                        <th className="px-4 py-3.5 text-center pr-8">预计完成时间</th>
                        <th className="px-4 py-3.5 text-center">备注</th>
                        {!readOnly && <th className="px-4 py-3.5 text-center w-16">操作</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredPlans.map(({ key, node, op, plan }) => {
                         const isSelected = selectedPlanKeys.has(key);

                         return (
                            <tr key={key} className={cn("hover:bg-blue-50/20 transition-colors group text-[13px] text-slate-700", isSelected && "bg-blue-50/40")}>
                               {/* Checkbox */}
                               {!readOnly && (
                               <td className="px-3 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected} 
                                    onChange={() => toggleSelectOp(key)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                                  />
                               </td>
                               )}

                               {/* Operation Info */}
                               <td className="px-4 py-4 border-r border-slate-100">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 font-mono text-[10px] flex items-center justify-center shrink-0">
                                       {op.stepIdx}
                                    </span>
                                    <span className="font-bold text-slate-800 whitespace-nowrap">
                                       {op.opName}
                                    </span>
                                    {plan.isSplit && (
                                       <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.2 rounded font-medium shrink-0">
                                          拆分项
                                       </span>
                                    )}
                                  </div>
                               </td>

                               {/* Material Info */}
                               {!readOnly && (
                                 <td className="px-4 py-4 border-r border-slate-100 bg-slate-50/20">
                                    <div className="font-medium text-slate-800">{node.name}</div>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{node.code}</div>
                                 </td>
                               )}

                               {/* Reporting Type */}
                               <td className="px-4 py-4 text-center border-r border-slate-100">
                                 <div className="flex flex-col items-center gap-1">
                                    <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                                      {op.reportingType === 'TIME' ? '计时' : '计件'}
                                    </span>
                                 </div>
                               </td>

                               {/* Work Center Code */}
                               <td className="px-4 py-4 border-r border-slate-100">
                                  <input 
                                     type="text" 
                                     value={plan.workCenterCode || ''} 
                                     onChange={(e) => updatePlanItem(key, { workCenterCode: e.target.value })}
                                     placeholder="编码"
                                     className="w-[90px] mx-auto block text-[13px] text-center px-2 py-1.5 border border-transparent rounded bg-slate-50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[#1677ff] outline-none transition-all placeholder:text-slate-300" 
                                  />
                               </td>
                               {/* Work Center Name */}
                               <td className="px-4 py-4 border-r border-slate-100">
                                  <input 
                                     type="text" 
                                     value={plan.workCenterName || ''} 
                                     onChange={(e) => updatePlanItem(key, { workCenterName: e.target.value })}
                                     placeholder="名称"
                                     className="w-[110px] mx-auto block text-[13px] text-center px-2 py-1.5 border border-transparent rounded bg-slate-50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[#1677ff] outline-none transition-all placeholder:text-slate-300" 
                                  />
                               </td>
                               {/* Equipment Name */}
                               <td className="px-4 py-4 border-r border-slate-100">
                                  <input 
                                     type="text" 
                                     value={plan.equipmentName || ''} 
                                     onChange={(e) => updatePlanItem(key, { equipmentName: e.target.value })}
                                     placeholder="设备名"
                                     className="w-[90px] mx-auto block text-[13px] text-center px-2 py-1.5 border border-transparent rounded bg-slate-50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[#1677ff] outline-none transition-all placeholder:text-slate-300" 
                                  />
                               </td>

                               {/* Position & Employee */}
                               <td className="px-4 py-4 border-r border-slate-100">
                                  <input 
                                     type="text" 
                                     value={plan.position || '操作工'} 
                                     onChange={(e) => updatePlanItem(key, { position: e.target.value })}
                                     placeholder="岗位"
                                     className="w-[75px] mx-auto block text-[13px] text-center px-2 py-1.5 border border-transparent rounded bg-slate-50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[#1677ff] outline-none transition-all placeholder:text-slate-300" 
                                  />
                               </td>
                               <td className="px-4 py-4 border-r border-slate-100">
                                  <input 
                                     type="text" 
                                     value={plan.employee || ''} 
                                     onChange={(e) => updatePlanItem(key, { employee: e.target.value })}
                                     placeholder="员工"
                                     className="w-[85px] mx-auto block text-[13px] text-center px-2 py-1.5 border border-transparent rounded bg-slate-50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[#1677ff] outline-none transition-all placeholder:text-slate-300 font-medium text-blue-700" 
                                  />
                               </td>

                               {/* Quantities */}
                               <td className="px-4 py-4 border-r border-slate-100 text-center">
                                  <input 
                                     type="number" 
                                     value={plan.scheduledQuantity} 
                                     onChange={(e) => updatePlanItem(key, { scheduledQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                                     className="w-[80px] mx-auto block font-mono text-[13px] text-center font-bold text-blue-700 px-2 py-1.5 border border-blue-200 bg-blue-50/50 hover:bg-white hover:border-blue-400 focus:bg-white focus:border-[#1677ff] outline-none rounded transition-all shadow-xs" 
                                     title="本次计划排产数量"
                                  />
                               </td>
                               <td className="px-4 py-4 border-r border-slate-100 text-center">
                                  <div className="w-[70px] mx-auto text-emerald-600 font-mono text-[13px] font-bold bg-emerald-50 px-2 py-1.5 rounded border border-emerald-100 shadow-2xs whitespace-nowrap" title="已计划数量">
                                     0 <span className="text-[10px] font-normal text-emerald-500">已计</span>
                                  </div>
                               </td>

                               {/* Timings */}
                               <td className="px-4 py-4 border-r border-slate-100">
                                  <input 
                                     type="date" 
                                     value={plan.plannedStartTime ? plan.plannedStartTime.split('T')[0] : ''} 
                                     onChange={(e) => updatePlanItem(key, { plannedStartTime: e.target.value })}
                                     className="w-[125px] mx-auto block text-[12px] text-center px-2 py-1.5 border border-transparent rounded bg-slate-50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[#1677ff] outline-none transition-all text-slate-600" 
                                  />
                               </td>
                               <td className="px-4 py-4 pr-8 border-r border-slate-100">
                                  <input 
                                     type="date" 
                                     value={plan.estimatedEndTime ? plan.estimatedEndTime.split('T')[0] : ''} 
                                     onChange={(e) => updatePlanItem(key, { estimatedEndTime: e.target.value })}
                                     className="w-[125px] mx-auto block text-[12px] text-center px-2 py-1.5 border border-transparent rounded bg-slate-50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[#1677ff] outline-none transition-all text-slate-600" 
                                  />
                               </td>

                               {/* Remark */}
                               <td className="px-4 py-4 border-r border-slate-100">
                                  <input 
                                     type="text" 
                                     value={plan.remark || ''} 
                                     onChange={(e) => updatePlanItem(key, { remark: e.target.value })}
                                     placeholder="备注说明"
                                     className="w-[110px] mx-auto block text-[12px] text-center px-2 py-1.5 border border-transparent rounded bg-slate-50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[#1677ff] outline-none transition-all placeholder:text-slate-300 text-slate-600" 
                                  />
                               </td>

                               {/* Actions */}
                               {!readOnly && (
                               <td className="px-4 py-4 text-center whitespace-nowrap">
                                  <div className="relative inline-flex items-center justify-center">
                                     <button
                                       onClick={(e) => handleToggleActionMenu(e, key, node, op, plan)}
                                       className={cn(
                                         "w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer mx-auto action-menu-trigger-btn",
                                         actionMenuState?.key === key && "bg-slate-100 text-slate-900 shadow-2xs"
                                       )}
                                       title="操作"
                                     >
                                       <MoreVertical className="w-4 h-4 pointer-events-none" />
                                     </button>
                                  </div>
                               </td>
                               )}
                            </tr>
                         );
                      })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Batch Edit Modal */}
      {isBatchEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">批量修改工序属性</h3>
                  <p className="text-xs text-slate-500">对已勾选的 {selectedPlanKeys.size} 道工序统一覆盖赋值</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBatchEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-500 text-[11px] bg-blue-50 p-2.5 rounded border border-blue-100">
                提示：未填写的字段将保持原物料工序的现有设置，仅对填入的项进行批量修改。
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">指派员工</label>
                  <input 
                    type="text" 
                    value={batchEditForm.employee} 
                    onChange={(e) => setBatchEditForm({ ...batchEditForm, employee: e.target.value })}
                    placeholder="例如: 张师傅"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none font-medium text-blue-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">岗位</label>
                  <input 
                    type="text" 
                    value={batchEditForm.position} 
                    onChange={(e) => setBatchEditForm({ ...batchEditForm, position: e.target.value })}
                    placeholder="例如: 高级焊工"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">工作站编码</label>
                  <input 
                    type="text" 
                    value={batchEditForm.workCenterCode} 
                    onChange={(e) => setBatchEditForm({ ...batchEditForm, workCenterCode: e.target.value })}
                    placeholder="例如: WS-01"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">工作站名称</label>
                  <input 
                    type="text" 
                    value={batchEditForm.workCenterName} 
                    onChange={(e) => setBatchEditForm({ ...batchEditForm, workCenterName: e.target.value })}
                    placeholder="例如: 焊接工作站01"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">设备</label>
                  <input 
                    type="text" 
                    value={batchEditForm.equipmentName || ''} 
                    onChange={(e) => setBatchEditForm({ ...batchEditForm, equipmentName: e.target.value })}
                    placeholder="例如: 设备A"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">计划开始时间</label>
                  <input 
                    type="date" 
                    value={batchEditForm.plannedStartTime} 
                    onChange={(e) => setBatchEditForm({ ...batchEditForm, plannedStartTime: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">预计完成时间</label>
                  <input 
                    type="date" 
                    value={batchEditForm.estimatedEndTime} 
                    onChange={(e) => setBatchEditForm({ ...batchEditForm, estimatedEndTime: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">备注说明</label>
                <input 
                  type="text" 
                  value={batchEditForm.remark} 
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, remark: e.target.value })}
                  placeholder="例如: 统一加急排产"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsBatchEditModalOpen(false)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded hover:bg-slate-100 transition cursor-pointer"
              >
                取消
              </button>
              <button 
                onClick={handleApplyBatchEditModal}
                className="px-5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded shadow-sm transition cursor-pointer"
              >
                一键应用至已选工序 ({selectedPlanKeys.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Operation Modal */}
      {splitModalItem && (
         <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-[1280px] overflow-hidden flex flex-col max-h-[90vh]">
               
               {/* Modal Header */}
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                     <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Scissors className="w-5 h-5" />
                     </div>
                     <div>
                        <h3 className="text-base font-bold text-slate-800">工序任务拆分设置</h3>
                        
                     </div>
                  </div>
                  <button 
                    onClick={() => setSplitModalItem(null)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2 py-1 cursor-pointer"
                  >
                    ×
                  </button>
               </div>

               {/* Summary Banner */}
               <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs text-slate-700">
                  <div>
                     <span className="text-slate-500">物料: </span>
                     <span className="font-bold text-slate-800 mr-4">{splitModalItem.node.name} ({splitModalItem.node.code})</span>
                     <span className="text-slate-500">工序: </span>
                     <span className="font-bold text-blue-700">{splitModalItem.op.opName}</span>
                  </div>
                  <div className="bg-white px-3 py-1 rounded border border-blue-200 font-bold text-blue-800 text-sm">
                     需求总数量: <span className="font-mono text-base">{splitModalItem.totalDemand}</span> 台
                  </div>
               </div>

               {/* Split Table */}
               <div className="p-6 overflow-y-auto flex-1">
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
                       <thead className="bg-slate-100 text-slate-600 font-bold">
                          <tr className="border-b border-slate-200">
                             <th className="p-2.5 w-10 text-center">
                                <input 
                                  type="checkbox"
                                  checked={isAllSplitRowsSelected}
                                  onChange={handleToggleSelectAllSplitRows}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  title="全选 / 反选所有拆分项"
                                />
                             </th>
                             <th className="p-2.5 w-8 text-center">#</th>
                             <th className="p-2.5 min-w-[100px]">工作站编码</th>
                             <th className="p-2.5 min-w-[130px]">工作站名称</th>
                             <th className="p-2.5 min-w-[110px]">设备</th>
                             <th className="p-2.5 min-w-[90px]">岗位</th>
                             <th className="p-2.5 min-w-[100px]">指派员工</th>
                             <th className="p-2.5 min-w-[100px] text-center bg-emerald-50/50 text-emerald-900">任务拆分数量</th>
                             <th className="p-2.5 min-w-[125px] text-center bg-indigo-50/50 text-indigo-900">计划开始时间</th>
                             <th className="p-2.5 min-w-[125px] text-center bg-indigo-50/50 text-indigo-900">预计完成时间</th>
                             <th className="p-2.5 min-w-[140px]">备注 / 批次说明</th>
                             <th className="p-2.5 w-10 text-center">操作</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 bg-white">
                          {splitRows.map((row, idx) => (
                             <tr key={row.id} className={cn("transition-colors", selectedSplitRowIds.has(row.id) ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-slate-50/80")}>
                                <td className="p-2 text-center">
                                   <input 
                                     type="checkbox"
                                     checked={selectedSplitRowIds.has(row.id)}
                                     onChange={() => handleToggleSplitRowSelect(row.id)}
                                     className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                   />
                                </td>
                                <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                                {/* 工作站编码 */}
                                <td className="p-2">
                                   <input 
                                     type="text"
                                     value={row.workCenterCode}
                                     onChange={(e) => {
                                        const newRows = [...splitRows];
                                        newRows[idx].workCenterCode = e.target.value;
                                        setSplitRows(newRows);
                                     }}
                                     placeholder="例: WS-01"
                                     className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono focus:border-blue-500 outline-none"
                                   />
                                </td>
                                {/* 工作站名称 */}
                                <td className="p-2">
                                   <input 
                                     type="text"
                                     value={row.workCenterName}
                                     onChange={(e) => {
                                        const newRows = [...splitRows];
                                        newRows[idx].workCenterName = e.target.value;
                                        setSplitRows(newRows);
                                     }}
                                     placeholder="例: 工作站A线"
                                     className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:border-blue-500 outline-none"
                                   />
                                </td>
                                {/* 设备 */}
                                <td className="p-2">
                                   <input 
                                     type="text"
                                     value={row.equipmentName || ''}
                                     onChange={(e) => {
                                        const newRows = [...splitRows];
                                        newRows[idx].equipmentName = e.target.value;
                                        setSplitRows(newRows);
                                     }}
                                     placeholder="例: 设备1#"
                                     className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:border-blue-500 outline-none"
                                   />
                                </td>
                                {/* 岗位 */}
                                <td className="p-2">
                                   <input 
                                     type="text"
                                     value={row.position}
                                     onChange={(e) => {
                                        const newRows = [...splitRows];
                                        newRows[idx].position = e.target.value;
                                        setSplitRows(newRows);
                                     }}
                                     placeholder="操作工"
                                     className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:border-blue-500 outline-none"
                                   />
                                </td>
                                {/* 指派员工 */}
                                <td className="p-2">
                                   <input 
                                     type="text"
                                     value={row.employee}
                                     onChange={(e) => {
                                        const newRows = [...splitRows];
                                        newRows[idx].employee = e.target.value;
                                        setSplitRows(newRows);
                                     }}
                                     placeholder="指派人员"
                                     className="w-full px-2 py-1 border border-blue-200 bg-blue-50/30 text-blue-700 font-bold rounded text-xs focus:border-blue-500 outline-none"
                                   />
                                </td>
                                {/* 拆分排产数量 */}
                                <td className="p-2 bg-emerald-50/10">
                                   <input 
                                     type="number"
                                     min="1"
                                     value={row.quantity}
                                     onChange={(e) => {
                                        const newRows = [...splitRows];
                                        newRows[idx].quantity = Math.max(1, parseInt(e.target.value) || 0);
                                        setSplitRows(newRows);
                                     }}
                                     className="w-full px-2 py-1 border border-emerald-300 bg-emerald-50/30 rounded text-xs text-center font-mono font-bold text-emerald-800 focus:border-emerald-500 outline-none"
                                   />
                                </td>
                                {/* 计划开始时间 */}
                                <td className="p-2 bg-indigo-50/10">
                                   <input 
                                     type="date"
                                     value={row.plannedStartTime ? row.plannedStartTime.split('T')[0] : ''}
                                     onChange={(e) => {
                                        const newRows = [...splitRows];
                                        newRows[idx].plannedStartTime = e.target.value;
                                        setSplitRows(newRows);
                                     }}
                                     className="w-full px-1.5 py-1 border border-indigo-200 rounded text-xs text-slate-700 focus:border-indigo-500 outline-none"
                                   />
                                </td>
                                {/* 预计完成时间 */}
                                <td className="p-2 bg-indigo-50/10">
                                   <input 
                                     type="date"
                                     value={row.estimatedEndTime ? row.estimatedEndTime.split('T')[0] : ''}
                                     onChange={(e) => {
                                        const newRows = [...splitRows];
                                        newRows[idx].estimatedEndTime = e.target.value;
                                        setSplitRows(newRows);
                                     }}
                                     className="w-full px-1.5 py-1 border border-indigo-200 rounded text-xs text-slate-700 focus:border-indigo-500 outline-none"
                                   />
                                </td>
                                {/* 备注 */}
                                <td className="p-2">
                                   <input 
                                     type="text"
                                     value={row.remark}
                                     onChange={(e) => {
                                        const newRows = [...splitRows];
                                        newRows[idx].remark = e.target.value;
                                        setSplitRows(newRows);
                                     }}
                                     placeholder="批次/分排说明"
                                     className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:border-blue-500 outline-none"
                                   />
                                </td>
                                {/* 操作 */}
                                <td className="p-2 text-center">
                                   <button 
                                     onClick={() => {
                                        if (splitRows.length <= 1) return;
                                        setSplitRows(splitRows.filter((_, i) => i !== idx));
                                     }}
                                     disabled={splitRows.length <= 1}
                                     className={cn(
                                       "inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors cursor-pointer",
                                       splitRows.length <= 1
                                         ? "text-slate-300 cursor-not-allowed"
                                         : "text-red-600 hover:text-red-800 hover:bg-red-50"
                                     )}
                                     title={splitRows.length <= 1 ? "至少保留一个拆分项" : "删除此拆分项"}
                                   >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      删除
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <button 
                           onClick={() => setSplitRows([
                              ...splitRows, 
                              { 
                                id: Date.now().toString(), 
                                workCenterCode: splitModalItem.op.workCenterCode || `WS-0${(splitRows.length % 5) + 1}`,
                                workCenterName: `工作站${String.fromCharCode(65 + splitRows.length)}线`,
                                equipmentName: `设备${splitRows.length + 1}#`, 
                                position: '操作工',
                                employee: '作业员', 
                                quantity: 1, 
                                plannedStartTime: '2026-06-10',
                                estimatedEndTime: '2026-06-10',
                                remark: '' 
                              }
                           ])}
                           className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                           <Plus className="w-3.5 h-3.5" />
                           添加拆分项
                        </button>

                        <button
                           onClick={handleBatchDeleteSplitRows}
                           disabled={selectedSplitRowIds.size === 0}
                           className={cn(
                             "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded border transition-colors cursor-pointer",
                             selectedSplitRowIds.size === 0
                               ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"
                               : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                           )}
                           title={selectedSplitRowIds.size === 0 ? "请先勾选需要删除的拆分项" : `批量删除选中的 ${selectedSplitRowIds.size} 项`}
                        >
                           <Trash2 className="w-3.5 h-3.5" />
                           批量删除 {selectedSplitRowIds.size > 0 && `(${selectedSplitRowIds.size})`}
                        </button>
                     </div>

                     {selectedSplitRowIds.size > 0 && (
                        <span className="text-xs text-slate-500">
                           已选中 <strong className="text-red-600">${selectedSplitRowIds.size}</strong> / ${splitRows.length} 项
                        </span>
                     )}
                  </div>
               </div>

               {/* Validation Footer */}
               {(() => {
                  const splitSum = splitRows.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
                  const targetSum = splitModalItem.totalDemand;
                  const isMatch = splitSum === targetSum;

                  return (
                     <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                           {isMatch ? (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded">
                                 <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                 <span>任务拆分匹配：已分配 {splitSum} / {targetSum} 台</span>
                              </div>
                           ) : (
                              <div className="flex items-center gap-1.5 text-amber-800 font-bold bg-amber-50 border border-amber-200 px-3 py-1 rounded">
                                 <AlertCircle className="w-4 h-4 text-amber-600" />
                                 <span>差额提醒：任务已拆分 {splitSum} 台 (目标 {targetSum} 台，差额 {targetSum - splitSum} 台)</span>
                              </div>
                           )}
                        </div>

                        <div className="flex items-center gap-3">
                           <button 
                              onClick={() => setSplitModalItem(null)}
                              className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded hover:bg-slate-100 transition cursor-pointer"
                           >
                              取消
                           </button>
                           <button 
                              onClick={handleConfirmSplit}
                              className="px-5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded shadow-sm transition cursor-pointer"
                           >
                              确定
                           </button>
                        </div>
                     </div>
                  );
               })()}

            </div>
         </div>
      )}


      {/* Portal for Action Menu */}
      {actionMenuState && createPortal(
        <div 
          className="fixed z-[9999] portal-action-menu bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 min-w-[144px] flex flex-col animate-in fade-in zoom-in-95 duration-100"
          style={{ top: actionMenuState.top, left: actionMenuState.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeTab === 'PENDING' ? (
            <>
              <button
                onClick={() => {
                  setActionMenuState(null);
                  handleOpenSplitModal(actionMenuState.node, actionMenuState.op, actionMenuState.key, actionMenuState.plan.scheduledQuantity);
                }}
                disabled={actionMenuState.plan.scheduledQuantity <= 1}
                className={cn(
                  'w-full px-4 py-2.5 text-[13px] flex items-center gap-2 transition-colors',
                  actionMenuState.plan.scheduledQuantity <= 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-purple-700 hover:bg-purple-50 cursor-pointer font-medium'
                )}
              >
                <Scissors className="w-4 h-4 shrink-0" />
                <span>任务拆分</span>
              </button>

              <button
                onClick={() => {
                  setActionMenuState(null);
                  handleConfirmScheduleSingle(actionMenuState.key, actionMenuState.op.opName);
                }}
                className="w-full px-4 py-2.5 text-[13px] flex items-center gap-2 text-blue-600 hover:bg-blue-50 font-bold transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>生成任务</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setActionMenuState(null);
                handleCancelPlanSingle(actionMenuState.key, actionMenuState.plan, actionMenuState.op.opName);
              }}
              className="w-full px-4 py-2.5 text-[13px] flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>取消计划</span>
            </button>
          )}
          {actionMenuState.plan.isSplit && (
            <button
              onClick={() => {
                setActionMenuState(null);
                handleDeleteSplitPlan(actionMenuState.key);
              }}
              className="w-full px-4 py-2.5 text-[13px] flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer border-t border-slate-100"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>删除拆分项</span>
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default SchedulingPanel;
