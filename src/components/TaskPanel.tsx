import React, { useState, useEffect, useMemo } from 'react';
import type { BomNode, GeneratedTask, TaskPriority, SchedulePlanItem } from '../types';
import { initialBomCompositionList } from '../data';
import { 
  Search, Info, ChevronLeft, ChevronRight, Send, Trash2, CheckCircle2, AlertCircle, 
  Layers, ArrowRight, Activity, Package, MoreVertical, RotateCcw, AlertTriangle,
  Truck, Scissors, Building2, Clock, Eye
} from 'lucide-react';
import { cn } from '../lib/utils';
import BomTree from './BomTree';
import TransferOutsourceModal from './TransferOutsourceModal';

interface TaskPanelProps {
  readOnly?: boolean;
  bomData: BomNode;
  defaultPriority?: string;
  schedulePlanMap?: Record<string, SchedulePlanItem>;
  setSchedulePlanMap?: React.Dispatch<React.SetStateAction<Record<string, SchedulePlanItem>>>;
  onUpdateSchedulePlan?: (nodeId: string, opId: string, updates: Partial<SchedulePlanItem>) => void;
  onTaskClick?: (taskCode: string, task: GeneratedTask) => void;
}

export type PriorityType = TaskPriority;

let cachedTasks: GeneratedTask[] | null = null;

const flattenBom = (node: BomNode): BomNode[] => {
  return [node, ...(node.children || []).flatMap(flattenBom)];
};

const generateTasksFromBom = (
  bomData: BomNode, 
  defaultPriority: PriorityType = '中',
  schedulePlanMap?: Record<string, SchedulePlanItem>
): GeneratedTask[] => {
  const allNodes = flattenBom(bomData);
  const tasks: GeneratedTask[] = [];
  const hasPlanMap = schedulePlanMap && Object.keys(schedulePlanMap).length > 0;
  
  allNodes.forEach((n, nodeIdx) => {
    const comp = initialBomCompositionList.find(c => c.materialCode === n.code);
    let category = '-';
    if (comp) {
      if (comp.category.includes('钣金')) category = '钣金件';
      else if (comp.category.includes('机加')) category = '机加件';
    }
    
    const enabledOps = (n.operations || []).filter(op => op.isEnabled);
    enabledOps.forEach((op, opIdx) => {
      // Find all scheduled plan items for this node & op
      const allMatchingPlans = Object.values(schedulePlanMap || {}).filter(
        p => p.nodeId === n.id && p.opId === op.id
      );

      // Only plans that are scheduled (isScheduled !== false) generate production tasks
      const activePlans = allMatchingPlans.filter(p => p.isScheduled !== false);

      // If user has a plan map but this op is not scheduled, do not generate tasks
      if (hasPlanMap && allMatchingPlans.length > 0 && activePlans.length === 0) {
        return;
      }

      const isOpOutsource = op.executionType === 'OUTSOURCE';

      const plansToUse: SchedulePlanItem[] = activePlans.length > 0 ? activePlans : (hasPlanMap ? [] : [{
        id: `${n.id}-${op.id}`,
        nodeId: n.id,
        opId: op.id,
        scheduledQuantity: (n as any).quantity ?? comp?.totalDemand ?? 1,
        workCenterCode: isOpOutsource ? 'WS-OUTSOURCE' : (op.workCenterCode || `WS-0${(opIdx%3)+1}`),
        workCenterName: isOpOutsource ? ((op as any).supplierName || '特种精密热处理协作厂') : (op.workCenter || `工作站0${(opIdx%3)+1}`),
        position: isOpOutsource ? '外协加工' : '操作工',
        employee: isOpOutsource ? '外协对接人' : (opIdx % 2 === 0 ? '张师傅' : '李师傅'),
        plannedStartTime: '2026-06-10T08:00',
        estimatedEndTime: '2026-06-10T18:00',
        remark: op.remark || '',
        isScheduled: true
      }]);

      plansToUse.forEach((plan, subIdx) => {
        const taskId = plan.id || `${n.id}-${op.id}${subIdx > 0 ? `-sub-${subIdx}` : ''}`;
        const requiredQuantity = plan.scheduledQuantity ?? (n as any).quantity ?? comp?.totalDemand ?? 1;
        const workCenterCode = isOpOutsource ? 'WS-OUTSOURCE' : (plan.workCenterCode || op.workCenterCode || `WS-0${(opIdx%3)+1}`);
        const workCenterName = isOpOutsource ? ((op as any).supplierName || '特种精密热处理协作厂') : (plan.workCenterName || op.workCenter || `工作站0${(opIdx%3)+1}`);
        const equipmentCode = isOpOutsource ? '-' : (plan.equipmentCode || op.equipmentCode || `EQ-WS-0${(opIdx%3)+1}`);
        const equipmentName = isOpOutsource ? '-' : (plan.equipmentName || op.equipmentName || `设备${(opIdx%3)+1}#`);
        const position = isOpOutsource ? '外协加工' : (plan.position || '操作工');
        const employee = isOpOutsource ? '外协对接人' : (plan.employee || (opIdx % 2 === 0 ? '张师傅' : '李师傅'));
        const plannedStartTime = plan.plannedStartTime || '2026-06-10T08:00';
        const estimatedEndTime = plan.estimatedEndTime || '2026-06-10T18:00';
        const remark = plan.remark || op.remark || '';

        // 假数据策略：让 3 个 Tab（待下发、已下发、外协）都有丰富、真实的仿真数据供测试验证
        let isDispatched = plan.isDispatched !== undefined 
          ? plan.isDispatched 
          : ((nodeIdx + opIdx + subIdx) % 2 === 0);

        // 如果该任务是外协
        let progress = 0;
        let actualStartTime = '-';
        let actualEndTime = '-';
        let statusRemark = remark;

        if (isOpOutsource) {
          // 外协任务的进度和状态模拟
          const osCycle = (nodeIdx * 3 + opIdx) % 4;
          if (osCycle === 0) {
            progress = 0;
            statusRemark = '协议已签订，委外物料待外发';
          } else if (osCycle === 1) {
            progress = 45;
            actualStartTime = '2026-06-11 09:30';
            statusRemark = '外协承揽厂在制加工中，进度正常';
          } else if (osCycle === 2) {
            progress = 85;
            actualStartTime = '2026-06-10 14:00';
            statusRemark = '外协首批样件已到厂质检合格，剩余批量在途';
          } else {
            progress = 100;
            actualStartTime = '2026-06-09 08:30';
            actualEndTime = '2026-06-12 16:45';
            statusRemark = '外协全数加工完毕并通过品管IQC验收';
          }
        } else if (isDispatched) {
          // 自制已下发任务模拟：覆盖 待生产(0%)、生产中(30%-80%)、已完成(100%)、暂停等
          const dispCycle = (nodeIdx * 5 + opIdx) % 5;
          if (dispCycle === 0) {
            progress = 0;
            statusRemark = '任务已下发至车间班组，排队待生产';
          } else if (dispCycle === 1) {
            progress = 35;
            actualStartTime = '2026-06-11 08:30';
            statusRemark = '第一道加工正在进行中';
          } else if (dispCycle === 2) {
            progress = 75;
            actualStartTime = '2026-06-10 13:30';
            statusRemark = '大批量切削完成，正进行精修';
          } else if (dispCycle === 3) {
            progress = 100;
            actualStartTime = '2026-06-09 08:00';
            actualEndTime = '2026-06-11 17:15';
            statusRemark = '本工序加工完毕，已全数通过首检巡检';
          } else {
            progress = 20;
            actualStartTime = '2026-06-11 10:00';
            statusRemark = '主轴刀具轻微磨损，更换刀具维护中';
          }
        } else {
          // 待下发任务
          progress = 0;
          statusRemark = op.remark || '排产计划编制完毕，待主管一键下发';
        }

        const supplierName = (op as any).supplierName || (
          op.opCode === 'OP-WIRE' ? '昆山信捷特种线割加工中心' :
          op.opCode === 'OP-PAINT' ? '东莞市创联特种喷涂实业厂' :
          op.opCode === 'OP-OXIDE' ? '深圳市宏发表面热处理有限公司' :
          '精工精密五金实业有限公司'
        );

        const outsourcePrice = (
          op.opCode === 'OP-WIRE' ? 125 :
          op.opCode === 'OP-PAINT' ? 32 :
          op.opCode === 'OP-OXIDE' ? 16.5 :
          45.0
        );

        const outsourceDelivery = (
          op.opCode === 'OP-WIRE' ? '2026-06-25' :
          op.opCode === 'OP-PAINT' ? '2026-06-18' :
          op.opCode === 'OP-OXIDE' ? '2026-06-20' :
          '2026-06-22'
        );

        tasks.push({
          id: taskId,
          nodeId: n.id,
          materialCode: n.code,
          materialName: n.name,
          category,
          taskCode: `PT-202606-${nodeIdx.toString().padStart(3, '0')}-${(opIdx+1).toString().padStart(2, '0')}${subIdx > 0 ? `-${String.fromCharCode(65+subIdx)}` : ''}`,
          
          opId: op.id,
          opName: op.opName,
          priority: defaultPriority || (opIdx % 3 === 0 ? '紧急' : opIdx % 2 === 0 ? '高' : '中'),
          reportingType: plan.reportingType || op.reportingType || 'PIECE',
          executionType: op.executionType || 'SELF',
          taskType: isOpOutsource ? 'OUTSOURCE' : 'SELF',
          outsourceSupplier: isOpOutsource ? supplierName : undefined,
          outsourceDeliveryDate: isOpOutsource ? outsourceDelivery : undefined,
          outsourceUnitPrice: isOpOutsource ? outsourcePrice : undefined,
          workCenterCode,
          workCenterName: isOpOutsource ? `【外协】${supplierName}` : workCenterName,
          equipmentCode,
          equipmentName,
          
          position,
          employee: isOpOutsource ? '委外跟单员' : employee,
          requiredQuantity,
          completedQuantity: Math.round(requiredQuantity * (progress / 100)),
          progress,
          actualStartTime,
          actualEndTime,
          plannedStartTime,
          estimatedEndTime,
          remark: statusRemark,
          
          isDispatched,
          isSplit: plan.isSplit,
          subTag: plan.subTag
        });
      });
    });
  });
  
  return tasks;
};

export default function TaskPanel({ 
  bomData, 
  defaultPriority = '中', 
  schedulePlanMap, 
  setSchedulePlanMap,
  onUpdateSchedulePlan,
  onTaskClick,
  readOnly 
}: TaskPanelProps) {
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  // 第五页生产任务三态主页签：待下发任务 / 已下发任务 / 外协任务
  const [activeTab, setActiveTab] = useState<'UNISSUED' | 'DISPATCHED' | 'OUTSOURCE'>('UNISSUED');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [syncToast, setSyncToast] = useState<{ message: string; sub?: string } | null>(null);
  
  const [activeNodeId, setActiveNodeId] = useState<string>(bomData.id);
  const [checkedNodeIds, setCheckedNodeIds] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [showDeleteNoticeModal, setShowDeleteNoticeModal] = useState(false);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<GeneratedTask | null>(null);
  const [outsourceModalTask, setOutsourceModalTask] = useState<GeneratedTask | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuTaskId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveNodeId(bomData.id);
  }, [bomData.id]);

  useEffect(() => {
    const freshGenerated = generateTasksFromBom(bomData, (defaultPriority as PriorityType) || '中', schedulePlanMap);
    setTasks(freshGenerated);
    cachedTasks = freshGenerated;
  }, [bomData, defaultPriority, schedulePlanMap]);

  const updateTask = (id: string, updates: Partial<GeneratedTask>) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    setTasks(newTasks);
    cachedTasks = newTasks;
  };

  // Dispatch single task
  const handleDispatchSingle = (taskId: string) => {
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, isDispatched: true } : t);
    setTasks(newTasks);
    cachedTasks = newTasks;
    if (setSchedulePlanMap) {
      setSchedulePlanMap(prev => {
        const next = { ...prev };
        if (next[taskId]) {
          next[taskId] = { ...next[taskId], isDispatched: true };
        }
        return next;
      });
    }
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  };

  // Batch dispatch tasks
  const handleBatchDispatch = () => {
    if (selectedTaskIds.size === 0) return;
    const newTasks = tasks.map(t => selectedTaskIds.has(t.id) ? { ...t, isDispatched: true } : t);
    setTasks(newTasks);
    cachedTasks = newTasks;
    if (setSchedulePlanMap) {
      setSchedulePlanMap(prev => {
        const next = { ...prev };
        selectedTaskIds.forEach(id => {
          if (next[id]) {
            next[id] = { ...next[id], isDispatched: true };
          }
        });
        return next;
      });
    }
    setSelectedTaskIds(new Set());
  };

  // Task cancellation handler with schedule release
  const handleCancelTask = (task: GeneratedTask) => {
    // 1. Mark task as cancelled (kept in tasks array for record retention)
    const newTasks = tasks.map(t => t.id === task.id ? { ...t, isCancelled: true } : t);
    setTasks(newTasks);
    cachedTasks = newTasks;

    // 2. Synchronize schedulePlanMap: mark corresponding plan item as unscheduled & undispatched to release scheduling quantity
    if (setSchedulePlanMap) {
      setSchedulePlanMap(prev => {
        const next = { ...prev };
        const key = task.id || `${task.nodeId}-${task.opId}`;
        if (next[key]) {
          next[key] = { ...next[key], isScheduled: false, isDispatched: false };
        } else if (next[`${task.nodeId}-${task.opId}`]) {
          next[`${task.nodeId}-${task.opId}`] = { ...next[`${task.nodeId}-${task.opId}`], isScheduled: false, isDispatched: false };
        } else {
          next[key] = {
            id: key,
            nodeId: task.nodeId,
            opId: task.opId,
            materialCode: task.materialCode,
            materialName: task.materialName,
            opName: task.opName,
            scheduledQuantity: task.requiredQuantity,
            workCenterCode: task.workCenterCode,
            workCenterName: task.workCenterName,
            position: task.position,
            employee: task.employee,
            plannedStartTime: task.plannedStartTime,
            estimatedEndTime: task.estimatedEndTime,
            remark: task.remark,
            isScheduled: false,
            isDispatched: false,
            isSplit: task.isSplit
          };
        }
        return next;
      });
    }

    if (onUpdateSchedulePlan) {
      onUpdateSchedulePlan(task.nodeId, task.opId, { isScheduled: false, isDispatched: false });
    }

    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });

    // 3. Show notification
    setSyncToast({
      message: `已取消生产任务「${task.opName}」(${task.requiredQuantity}件)`,
      sub: `任务记录已保留在系统中（已下发任务列表中不再展示）；已释放排产数量 (${task.requiredQuantity}件)，排产计划中可重新排产生成生产任务。`
    });

    setTimeout(() => {
      setSyncToast(null);
    }, 4500);
  };

  // Task deletion handler with bidirectional schedule sync
  const handleDeleteTask = (task: GeneratedTask) => {
    // 1. Synchronize schedulePlanMap: mark the corresponding plan item as unscheduled (isScheduled: false, isDispatched: false)
    if (setSchedulePlanMap) {
      setSchedulePlanMap(prev => {
        const next = { ...prev };
        if (next[task.id]) {
          next[task.id] = { ...next[task.id], isScheduled: false, isDispatched: false };
        } else if (next[`${task.nodeId}-${task.opId}`]) {
          next[`${task.nodeId}-${task.opId}`] = { ...next[`${task.nodeId}-${task.opId}`], isScheduled: false, isDispatched: false };
        } else {
          const key = task.id || `${task.nodeId}-${task.opId}`;
          next[key] = {
            id: key,
            nodeId: task.nodeId,
            opId: task.opId,
            materialCode: task.materialCode,
            materialName: task.materialName,
            opName: task.opName,
            scheduledQuantity: task.requiredQuantity,
            workCenterCode: task.workCenterCode,
            workCenterName: task.workCenterName,
            position: task.position,
            employee: task.employee,
            plannedStartTime: task.plannedStartTime,
            estimatedEndTime: task.estimatedEndTime,
            remark: task.remark,
            isScheduled: false,
            isDispatched: false,
            isSplit: task.isSplit
          };
        }
        return next;
      });
    }

    if (onUpdateSchedulePlan) {
      onUpdateSchedulePlan(task.nodeId, task.opId, { isScheduled: false, isDispatched: false });
    }

    // 2. Remove task from current tasks state
    setTasks(prev => {
      const next = prev.filter(t => t.id !== task.id);
      cachedTasks = next;
      return next;
    });

    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });

    // 3. Show notification
    setSyncToast({
      message: `已删除生产任务「${task.opName}」(${task.requiredQuantity}件)`,
      sub: `该任务的排产数据 (${task.requiredQuantity}件) 已同步回退至排产页面的「待排产计划」中。`
    });

    setTimeout(() => {
      setSyncToast(null);
    }, 4000);
  };

  const handleTaskCodeClick = (task: GeneratedTask) => {
    if (!task.isDispatched) return;
    if (onTaskClick) {
      onTaskClick(task.taskCode, task);
    }
  };

  // Find all child node IDs of the currently selected tree node
  const getSubtreeNodeIds = (node: BomNode): string[] => {
    return [node.id, ...(node.children || []).flatMap(getSubtreeNodeIds)];
  };

  const findActiveNode = (node: BomNode, targetId: string): BomNode | null => {
    if (node.id === targetId) return node;
    for (const child of node.children || []) {
      const found = findActiveNode(child, targetId);
      if (found) return found;
    }
    return null;
  };

  const handleCheckNode = (id: string, checked: boolean) => {
    const targetNode = findActiveNode(bomData, id);
    if (!targetNode) return;
    const subIds = getSubtreeNodeIds(targetNode);

    setCheckedNodeIds(prev => {
      const next = new Set(prev);
      if (checked) {
        subIds.forEach(subId => next.add(subId));
      } else {
        subIds.forEach(subId => next.delete(subId));
      }
      return next;
    });
  };

  const handleSelectAllMaterials = () => {
    const allIds = getSubtreeNodeIds(bomData);
    setCheckedNodeIds(new Set(allIds));
  };

  const handleClearMaterialChecks = () => {
    setCheckedNodeIds(new Set());
  };

  // 确认转委外外协处理逻辑 (已开工部分拆单留痕，未开工整单变更)
  const handleConfirmOutsource = (data: {
    outsourceQty: number;
    supplier: string;
    deliveryDate: string;
    unitPrice?: number;
    reason: string;
    remark?: string;
  }) => {
    if (!outsourceModalTask) return;
    const task = outsourceModalTask;
    const isFullDirect = (task.completedQuantity || 0) === 0 && data.outsourceQty === task.requiredQuantity;

    if (isFullDirect) {
      const updated = tasks.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            taskType: 'OUTSOURCE' as const,
            executionType: 'OUTSOURCE' as const,
            outsourceSupplier: data.supplier,
            outsourceDeliveryDate: data.deliveryDate,
            outsourceUnitPrice: data.unitPrice,
            outsourceReason: data.reason,
            workCenterName: data.supplier,
            workCenterCode: 'OUTSOURCE-WS',
            employee: '外协对接人',
            remark: data.remark || t.remark
          };
        }
        return t;
      });
      setTasks(updated);
      cachedTasks = updated;

      setSyncToast({
        message: `任务「${task.opName}」已全额转为委外外协任务`,
        sub: `外协厂商：${data.supplier} | 交付期限：${data.deliveryDate} | 加工单价：${data.unitPrice !== undefined ? `¥${data.unitPrice}/件` : '待协商'}`
      });
    } else {
      const remainingQty = task.requiredQuantity - data.outsourceQty;
      const newOutsourceTask: GeneratedTask = {
        ...task,
        id: `${task.id}-OS-${Date.now().toString().slice(-4)}`,
        taskCode: `${task.taskCode}-OS`,
        requiredQuantity: data.outsourceQty,
        completedQuantity: 0,
        progress: 0,
        taskType: 'OUTSOURCE',
        executionType: 'OUTSOURCE',
        outsourceSupplier: data.supplier,
        outsourceDeliveryDate: data.deliveryDate,
        outsourceUnitPrice: data.unitPrice,
        outsourceReason: data.reason,
        sourceTaskId: task.id,
        workCenterName: data.supplier,
        workCenterCode: 'OUTSOURCE-WS',
        employee: '外协对接人',
        isDispatched: task.isDispatched,
        remark: data.remark || `由自制任务 ${task.taskCode} 拆单转委外`
      };

      const updated = tasks.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            requiredQuantity: remainingQty,
            outsourceSplittedQty: (t.outsourceSplittedQty || 0) + data.outsourceQty
          };
        }
        return t;
      });
      updated.push(newOutsourceTask);
      setTasks(updated);
      cachedTasks = updated;

      setSyncToast({
        message: `任务「${task.opName}」成功拆分保留自制历史并生成委外任务`,
        sub: `自制保留 ${remainingQty} 件，已外发 ${data.outsourceQty} 件（委外工单：${newOutsourceTask.taskCode}，厂商：${data.supplier}）`
      });
    }

    setTimeout(() => {
      setSyncToast(null);
    }, 4500);

    setOutsourceModalTask(null);
  };

  const selectedNode = findActiveNode(bomData, activeNodeId) || bomData;
  const activeSubtreeNodeIds = new Set(getSubtreeNodeIds(selectedNode));

  // Determine allowed nodes: if multiple nodes checked in sidebar, filter by checked nodes, else filter by active clicked node
  const effectiveAllowedNodeIds = checkedNodeIds.size > 0 ? checkedNodeIds : activeSubtreeNodeIds;

  // 直接三态页签任务统计：待下发任务 / 已下发任务 / 外协任务
  const unissuedCount = useMemo(() => {
    return tasks.filter(t => !t.isCancelled && !t.isDispatched && t.taskType !== 'OUTSOURCE').length;
  }, [tasks]);

  const dispatchedCount = useMemo(() => {
    return tasks.filter(t => !t.isCancelled && t.isDispatched && t.taskType !== 'OUTSOURCE').length;
  }, [tasks]);

  const outsourceCount = useMemo(() => {
    return tasks.filter(t => !t.isCancelled && t.taskType === 'OUTSOURCE').length;
  }, [tasks]);

  // Filter tasks based on tree node selection and activeTab
  const filteredTasks = tasks.filter(t => {
    // Exclude cancelled tasks from active tabs
    if (t.isCancelled) return false;

    // Direct 3-tab filter:
    if (activeTab === 'UNISSUED') {
      if (t.isDispatched || t.taskType === 'OUTSOURCE') return false;
    } else if (activeTab === 'DISPATCHED') {
      if (!t.isDispatched || t.taskType === 'OUTSOURCE') return false;
    } else if (activeTab === 'OUTSOURCE') {
      if (t.taskType !== 'OUTSOURCE') return false;
    }
    
    // Tree node filter
    if (!readOnly && !effectiveAllowedNodeIds.has(t.nodeId)) return false;
    
    return true;
  });

  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const isAllSelected = filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.has(t.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  // Batch dispatch filtered unissued tasks
  const handleBatchDispatchFiltered = () => {
    const unissuedFiltered = tasks.filter(t => !t.isDispatched && (readOnly || effectiveAllowedNodeIds.has(t.nodeId)));
    if (unissuedFiltered.length === 0) return;
    const targetIds = new Set(unissuedFiltered.map(t => t.id));
    const newTasks = tasks.map(t => targetIds.has(t.id) ? { ...t, isDispatched: true } : t);
    setTasks(newTasks);
    cachedTasks = newTasks;
    setSelectedTaskIds(new Set());
  };

  return (
    <div className="flex h-full w-full bg-white overflow-hidden relative">
      
      {/* Toast Notification */}
      {syncToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-800 text-white px-5 py-3.5 rounded-lg shadow-xl flex items-start gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-sm text-white">{syncToast.message}</div>
            {syncToast.sub && (
              <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                {syncToast.sub}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Left Sidebar: Product & Material Tree */}
      {!readOnly && (
        <div 
          className={cn(
            "border-r border-slate-200 bg-white flex flex-col shrink-0 transition-all duration-300 relative z-20",
            isSidebarOpen ? "w-[300px]" : "w-0 border-r-0"
          )}
        >
          {isSidebarOpen && (
            <div className="flex flex-col h-full w-[300px] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200/70 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">生产任务</span>
                  <button 
                    onClick={handleBatchDispatchFiltered}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium rounded shadow-2xs transition-colors cursor-pointer"
                    title="批量下发所选物料下的所有待下发任务"
                  >
                    <Send className="w-3 h-3" />
                    批量下发任务
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
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
              <div className="flex-1 overflow-y-auto p-2">
                <BomTree 
                  node={bomData}
                  activeNodeId={activeNodeId}
                  onSelect={(id) => setActiveNodeId(id)}
                  checkedNodes={checkedNodeIds}
                  onCheckNode={handleCheckNode}
                  hideCheckboxes={false}
                />
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-30 w-3.5 h-12 bg-white border border-slate-200 rounded-r flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-xs"
            title={isSidebarOpen ? "折叠生产任务树" : "展开生产任务树"}
          >
            {isSidebarOpen ? <ChevronLeft className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-hidden">
        {/* 第五页生产任务三态主页签：待下发任务 / 已下发任务 / 外协任务 */}
        <div className="bg-white border-b border-slate-200 px-6 pt-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-8">
            <button
              onClick={() => {
                setActiveTab('UNISSUED');
                setSelectedTaskIds(new Set());
              }}
              className={cn(
                "pb-3 text-[13px] font-medium border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
                activeTab === 'UNISSUED' 
                  ? "border-[#1677ff] text-[#1677ff] font-bold" 
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <span>待下发任务</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-mono",
                activeTab === 'UNISSUED' ? "bg-blue-50 text-[#1677ff] font-bold" : "bg-slate-100 text-slate-500"
              )}>
                {unissuedCount}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('DISPATCHED');
                setSelectedTaskIds(new Set());
              }}
              className={cn(
                "pb-3 text-[13px] font-medium border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
                activeTab === 'DISPATCHED' 
                  ? "border-[#1677ff] text-[#1677ff] font-bold" 
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <span>已下发任务</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-mono",
                activeTab === 'DISPATCHED' ? "bg-blue-50 text-[#1677ff] font-bold" : "bg-slate-100 text-slate-500"
              )}>
                {dispatchedCount}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('OUTSOURCE');
                setSelectedTaskIds(new Set());
              }}
              className={cn(
                "pb-3 text-[13px] font-medium border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
                activeTab === 'OUTSOURCE' 
                  ? "border-purple-600 text-purple-700 font-bold" 
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <Truck className={cn("w-4 h-4", activeTab === 'OUTSOURCE' ? "text-purple-600" : "text-slate-400")} />
              <span>外协任务</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-mono",
                activeTab === 'OUTSOURCE' ? "bg-purple-100 text-purple-700 font-bold" : "bg-slate-100 text-slate-500"
              )}>
                {outsourceCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 pb-3">
            {activeTab === 'OUTSOURCE' && (
              <div className="text-[11px] text-purple-800 bg-purple-50 px-2.5 py-1 rounded border border-purple-200/80 flex items-center gap-1.5 font-medium">
                <Truck className="w-3.5 h-3.5 text-purple-600" />
                <span>委外外协加工视窗：统一跟踪外部承揽厂商交付进度、质检合格数与协议交期</span>
              </div>
            )}

            {activeTab === 'UNISSUED' && !readOnly && (
              <button
                disabled={selectedTaskIds.size === 0}
                onClick={handleBatchDispatch}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded shadow-xs transition",
                  selectedTaskIds.size > 0 
                    ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" 
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                )}
                title={selectedTaskIds.size > 0 ? `下发已选中的 ${selectedTaskIds.size} 项任务` : "请先勾选需要下发的任务"}
              >
                <Send className="w-3.5 h-3.5" />
                <span>批量下发选中任务</span>
                {selectedTaskIds.size > 0 && (
                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {selectedTaskIds.size}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Table Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-50 p-6 relative custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
              <Package className="w-10 h-10 opacity-20 mx-auto mb-3" />
              <p className="text-sm">
                {activeTab === 'UNISSUED' 
                  ? '暂无待下发任务' 
                  : activeTab === 'DISPATCHED' 
                  ? '暂无已下发任务' 
                  : '暂无委外外协任务'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs min-w-max">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-slate-50/80 sticky top-0 shadow-xs border-b border-slate-200 z-10">
                  <tr className="text-[12px] font-bold text-slate-600 tracking-wider">
                    {!readOnly && activeTab === 'UNISSUED' && (
                      <th className="px-3 py-3.5 text-center w-10">
                        <input 
                          type="checkbox" 
                          checked={isAllSelected} 
                          onChange={toggleSelectAll} 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                        />
                      </th>
                    )}
                    {/* 1. 任务编码 (已下发与外协任务中展示) */}
                    {(activeTab === 'DISPATCHED' || activeTab === 'OUTSOURCE') && (
                      <th className="px-4 py-3.5 text-center">任务编码</th>
                    )}
                    {/* 2. 工序 */}
                    <th className="px-4 py-3.5 text-center">工序</th>
                    {/* 3. 物料信息 */}
                    {!readOnly && <th className="px-4 py-3.5 text-center">物料信息</th>}
                    {/* 4. 工作站 / 委外承揽厂商 */}
                    <th className="px-4 py-3.5 text-center">
                      {activeTab === 'OUTSOURCE' ? '委外承揽厂商' : '工作站编码 / 名称'}
                    </th>
                    {/* 4.5 设备 (自制任务展示) */}
                    {activeTab !== 'OUTSOURCE' && <th className="px-4 py-3.5 text-center">设备</th>}
                    {/* 5. 岗位 (自制任务展示) */}
                    {activeTab !== 'OUTSOURCE' && <th className="px-4 py-3.5 text-center">岗位</th>}
                    {/* 6. 员工 / 外协对接人 */}
                    <th className="px-4 py-3.5 text-center">
                      {activeTab === 'OUTSOURCE' ? '外协对接人' : '员工'}
                    </th>
                    {/* 7. 排产数量 / 外发数量 */}
                    <th className="px-4 py-3.5 text-center">
                      {activeTab === 'OUTSOURCE' ? '外发数量' : '排产数量'}
                    </th>
                    {/* 7.5 外协单价 (仅外协展示) */}
                    {activeTab === 'OUTSOURCE' && (
                      <th className="px-4 py-3.5 text-center">外协单价</th>
                    )}
                    {/* 8. 优先级 */}
                    <th className="px-4 py-3.5 text-center">优先级</th>
                    {/* 9. 报工方式 */}
                    <th className="px-4 py-3.5 text-center">报工方式</th>
                    {/* 10. 生产进度 / 完工进度 (已下发与外协展示) */}
                    {(activeTab === 'DISPATCHED' || activeTab === 'OUTSOURCE') && (
                      <th className="px-4 py-3.5 text-center">
                        {activeTab === 'OUTSOURCE' ? '完工进度' : '生产进度'}
                      </th>
                    )}
                    {/* 11. 计划时间 / 协议交期 */}
                    <th className="px-4 py-3.5 text-center">
                      {activeTab === 'OUTSOURCE' ? '协议交付截止日' : '计划开始 / 预计完成'}
                    </th>
                    {/* 12. 备注 */}
                    <th className="px-4 py-3.5 text-center">备注</th>
                    {/* 13. 操作 */}
                    {!readOnly && (
                      <th className="px-4 py-3.5 text-center sticky right-0 z-20 bg-slate-50 border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                        操作
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map(task => {
                    const isSelected = selectedTaskIds.has(task.id);
                    return (
                      <tr key={task.id} className={cn("hover:bg-blue-50/20 transition-colors text-[13px] text-slate-600", isSelected && "bg-blue-50/40")}>
                        
                        {/* Checkbox */}
                        {!readOnly && activeTab === 'UNISSUED' && (
                          <td className="px-3 py-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => toggleSelectTask(task.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
                        
                        {/* 1. 任务编码 (已下发任务与外协任务展示并支持点击跳转详情) */}
                        {(activeTab === 'DISPATCHED' || activeTab === 'OUTSOURCE') && (
                          <td className="px-4 py-4 text-center border-r border-slate-100">
                            <div className="flex flex-col items-center gap-1">
                              <button 
                                onClick={() => handleTaskCodeClick(task)}
                                className={cn(
                                  "font-mono hover:underline transition-colors font-medium text-xs cursor-pointer",
                                  task.taskType === 'OUTSOURCE' ? "text-purple-600 hover:text-purple-800" : "text-blue-600 hover:text-blue-800"
                                )}
                                title="点击查看任务详情"
                              >
                                {task.taskCode}
                              </button>
                              {task.isSplit && (
                                <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.2 rounded font-medium">
                                  已拆分
                                </span>
                              )}
                              {task.taskType === 'OUTSOURCE' && (
                                <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200/80 px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-0.5">
                                  <Truck className="w-3 h-3 text-purple-600" />
                                  委外外协
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* 2. 工序 */}
                        <td className="px-4 py-4 text-center align-top border-r border-slate-100 font-medium text-slate-800">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center justify-center gap-1.5">
                              <span>{task.opName}</span>
                              {task.taskType === 'OUTSOURCE' && (
                                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-0.5">
                                  <Truck className="w-3 h-3 text-purple-600" />
                                  外协
                                </span>
                              )}
                              {task.isSplit && activeTab === 'UNISSUED' && (
                                <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.2 rounded font-medium">
                                  拆分项
                                </span>
                              )}
                            </div>
                            {task.outsourceSplittedQty && task.outsourceSplittedQty > 0 ? (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-medium inline-flex items-center gap-0.5">
                                <Scissors className="w-3 h-3 text-amber-600" />
                                已外发 {task.outsourceSplittedQty} 件
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 3. 物料信息 */}
                        {!readOnly && (
                          <td className="px-4 py-4 align-top border-r border-slate-100 bg-white">
                            <div className="font-medium text-slate-800">{task.materialName}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{task.materialCode}</div>
                          </td>
                        )}

                        {/* 4. 工作站编码 / 名称 (自制) 或 委外承揽厂商 (外协) */}
                        <td className="px-4 py-4 align-top border-r border-slate-100 text-center">
                          {task.taskType === 'OUTSOURCE' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="font-semibold text-purple-800 flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5 text-purple-600" />
                                <span>{task.outsourceSupplier || task.workCenterName || '外部协作厂'}</span>
                              </div>
                              <div className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200/60">
                                委外承揽厂商
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-slate-700">{task.workCenterName || '-'}</div>
                              <div className="text-xs text-slate-400 font-mono">{task.workCenterCode || '-'}</div>
                            </>
                          )}
                        </td>

                        {/* 4.5 设备 (仅自制展示) */}
                        {activeTab !== 'OUTSOURCE' && (
                          <td className="px-4 py-4 align-top border-r border-slate-100 text-center">
                            <div className="font-medium text-slate-700">{task.equipmentName || '-'}</div>
                          </td>
                        )}

                        {/* 5. 岗位 (仅自制展示) */}
                        {activeTab !== 'OUTSOURCE' && (
                          <td className="px-4 py-4 align-top border-r border-slate-100 text-center">
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium inline-block">
                              {task.position || '操作工'}
                            </span>
                          </td>
                        )}

                        {/* 6. 员工 / 外协对接人 */}
                        <td className="px-4 py-4 align-top border-r border-slate-100 text-center">
                          <span className={cn(
                            "font-medium inline-block",
                            task.taskType === 'OUTSOURCE' ? "text-purple-700 text-xs font-semibold" : "text-slate-700"
                          )}>
                            {task.taskType === 'OUTSOURCE' 
                              ? (task.employee || '外协管理员') 
                              : (task.employee || '-')}
                          </span>
                        </td>

                        {/* 7. 排产数量 / 外发数量 */}
                        <td className="px-4 py-4 align-top border-r border-slate-100 text-center">
                          <span className={cn(
                            "font-mono font-bold text-[14px] px-2 py-0.5 rounded",
                            task.taskType === 'OUTSOURCE' ? "text-purple-800 bg-purple-50 border border-purple-200/60" : "text-slate-800 bg-slate-100"
                          )}>
                            {task.taskType === 'OUTSOURCE' ? (task.outsourceQty || task.requiredQuantity) : task.requiredQuantity}
                          </span>
                        </td>

                        {/* 7.5 外协单价 (仅外协展示) */}
                        {activeTab === 'OUTSOURCE' && (
                          <td className="px-4 py-4 align-top border-r border-slate-100 text-center">
                            <span className="font-mono font-bold text-xs text-purple-900 bg-purple-50/50 px-2 py-0.5 rounded border border-purple-200/60">
                              {task.outsourceUnitPrice !== undefined && task.outsourceUnitPrice > 0 
                                ? `¥${task.outsourceUnitPrice}` 
                                : '待商定'}
                            </span>
                          </td>
                        )}

                        {/* 8. 优先级 */}
                        <td className="px-4 py-4 align-top border-r border-slate-100 text-center">
                          <select
                            value={task.priority || '中'}
                            onChange={(e) => updateTask(task.id, { priority: e.target.value as PriorityType })}
                            className="text-[11px] border border-slate-200 hover:border-slate-300 rounded px-1.5 py-0.5 bg-white focus:border-[#1677ff] outline-none block mx-auto cursor-pointer font-medium text-slate-700 shadow-2xs"
                          >
                            <option value="紧急">紧急</option>
                            <option value="高">高</option>
                            <option value="中">中</option>
                            <option value="低">低</option>
                          </select>
                        </td>

                        {/* 9. 报工方式 */}
                        <td className="px-4 py-4 align-top border-r border-slate-100 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                              {task.reportingType === 'TIME' ? '计时' : '计件'}
                            </span>
                          </div>
                        </td>

                        {/* 10. 生产进度 / 完工进度 (已下发与外协展示) */}
                        {(activeTab === 'DISPATCHED' || activeTab === 'OUTSOURCE') && (
                          <td className="px-4 py-4 align-top border-r border-slate-100 text-center">
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    (task.progress ?? 0) === 100 
                                      ? "bg-emerald-500" 
                                      : task.taskType === 'OUTSOURCE' 
                                      ? "bg-purple-500" 
                                      : (task.progress ?? 0) > 0 
                                      ? "bg-blue-500" 
                                      : "bg-slate-300"
                                  )} 
                                  style={{ width: `${task.progress ?? 0}%` }}
                                />
                              </div>
                              <span className="text-[12px] font-mono text-slate-700 font-medium">{task.progress ?? 0}%</span>
                            </div>
                          </td>
                        )}

                        {/* 10. 计划开始 / 预计完成 */}
                        <td className="px-4 py-4 align-top border-r border-slate-100 text-center text-xs text-slate-500">
                          {task.taskType === 'OUTSOURCE' && task.outsourceDeliveryDate ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs font-semibold text-purple-700 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-purple-600" />
                                交付: {task.outsourceDeliveryDate}
                              </span>
                              <span className="text-[11px] text-slate-400">计划: {task.plannedStartTime ? task.plannedStartTime.replace('T', ' ') : '-'}</span>
                            </div>
                          ) : (
                            <>
                              <div>{task.plannedStartTime ? task.plannedStartTime.replace('T', ' ') : '-'}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">至 {task.estimatedEndTime ? task.estimatedEndTime.replace('T', ' ') : '-'}</div>
                            </>
                          )}
                        </td>

                        {/* 11. 备注 */}
                        <td className="px-4 py-4 align-top border-r border-slate-100 text-center text-xs">
                          {task.remark || '-'}
                        </td>

                        {/* 12. 操作: 转外协按钮与下拉操作菜单 */}
                        {!readOnly && (
                          <td className={cn(
                            "px-3 py-4 align-top text-center sticky right-0 z-10 border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors",
                            isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-blue-50/20"
                          )}>
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {/* Outsource task quick action: View Details */}
                              {task.taskType === 'OUTSOURCE' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskCodeClick(task);
                                  }}
                                  className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                  title="查看委外外协任务详情"
                                >
                                  <Eye className="w-3 h-3 text-purple-600" />
                                  <span>详情</span>
                                </button>
                              )}

                              {/* Self-made task quick action: Transfer Outsource */}
                              {task.taskType !== 'OUTSOURCE' && (!task.progress || task.progress < 100) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOutsourceModalTask(task);
                                  }}
                                  className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                  title="将该工序任务转为委外外协"
                                >
                                  <Truck className="w-3 h-3 text-purple-600" />
                                  <span>转外协</span>
                                </button>
                              )}

                              <div className="relative inline-block text-center">
                                <button 
                                  onClick={() => setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                  title="更多操作"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openMenuTaskId === task.id && (
                                  <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 text-left animate-in fade-in zoom-in-95 duration-100">
                                    {task.taskType === 'OUTSOURCE' && (
                                      <button
                                        onClick={() => {
                                          handleTaskCodeClick(task);
                                          setOpenMenuTaskId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                                        <span>外协详情</span>
                                      </button>
                                    )}
                                    {task.taskType !== 'OUTSOURCE' && (!task.progress || task.progress < 100) && (
                                      <button
                                        onClick={() => {
                                          setOutsourceModalTask(task);
                                          setOpenMenuTaskId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                                      >
                                        <Truck className="w-3.5 h-3.5 text-purple-600" />
                                        <span>转委外外协</span>
                                      </button>
                                    )}
                                    {!task.isDispatched ? (
                                      <button
                                        onClick={() => {
                                          handleDispatchSingle(task.id);
                                          setOpenMenuTaskId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>下发任务</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          handleCancelTask(task);
                                          setOpenMenuTaskId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>取消</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setPendingDeleteTask(task);
                                        setShowDeleteNoticeModal(true);
                                        setOpenMenuTaskId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>删除</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Notice Modal (Secondary Confirmation) */}
      {showDeleteNoticeModal && (
        <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => { setShowDeleteNoticeModal(false); setPendingDeleteTask(null); }}>
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 bg-amber-50/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">操作提示</h3>
                <p className="text-[11px] text-slate-500">生产任务删除限制说明</p>
              </div>
            </div>
            <div className="p-5 text-xs text-slate-700 leading-relaxed bg-white">
              已下发后生产任务为待生产状态，不允许删除仅支持取消，删除按钮为原型交互特有，请勿开发已下发任务/待生产任务的删除功能。
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setShowDeleteNoticeModal(false);
                  setPendingDeleteTask(null);
                }}
                className="px-4 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (pendingDeleteTask) {
                    handleDeleteTask(pendingDeleteTask);
                  }
                  setShowDeleteNoticeModal(false);
                  setPendingDeleteTask(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Outsource Modal */}
      <TransferOutsourceModal
        isOpen={!!outsourceModalTask}
        onClose={() => setOutsourceModalTask(null)}
        task={outsourceModalTask ? {
          id: outsourceModalTask.id,
          taskCode: outsourceModalTask.taskCode,
          taskName: `${outsourceModalTask.materialName} - ${outsourceModalTask.opName}`,
          opName: outsourceModalTask.opName,
          moNo: 'MO-202606-001',
          salesOrder: 'SO-2026-088',
          requiredQuantity: outsourceModalTask.requiredQuantity,
          completedQuantity: outsourceModalTask.completedQuantity || 0,
          status: outsourceModalTask.isDispatched 
            ? ((outsourceModalTask.progress || 0) > 0 ? ((outsourceModalTask.progress || 0) === 100 ? '已完成' : '生产中') : '待生产') 
            : '待下发',
          workStationName: outsourceModalTask.workCenterName,
          employee: outsourceModalTask.employee
        } : null}
        onConfirm={handleConfirmOutsource}
      />
    </div>
  );
}
