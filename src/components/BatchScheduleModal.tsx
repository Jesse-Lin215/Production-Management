import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Check, AlertCircle, Sparkles, Calendar, Clock, ChevronDown, ChevronRight, 
  Layers, User, Cpu, ArrowRight, CheckCircle2, RotateCcw, Filter, Eye, AlertTriangle,
  FileText, Briefcase, Scissors, Trash2, Plus, Wrench, MoreVertical, Send,
  Settings2, SlidersHorizontal, Search, ArrowLeft, Building2, Hash, Tag,
  CheckSquare, Square, Package, Activity, Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  OrderItem, 
  standardWorkCenters, 
  standardEmployees, 
  standardPositions,
  getRecommendedWorkCenter, 
  getRecommendedEmployee,
  saveOrderSchedulePlan,
  addProductionTask,
  getProductionTasks,
  updateProductionTaskStatus,
  deleteProductionTask,
  batchUpdateProductionTaskStatus
} from '../mockStore';
import { SchedulePlanItem, ReportingType, ProductionTask, TaskPriority, ProductionTaskStatus } from '../types';

export interface BatchScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: OrderItem[];
  onConfirmSchedule: (updatedOrders: OrderItem[], scheduledCount: number, taskCount: number) => void;
}

// Field configuration definitions for work order display
export interface OrderFieldOption {
  key: keyof OrderItem | 'spec' | 'drawingNo' | 'workshop' | 'lineItem';
  label: string;
  category: '业务信息' | '产品属性' | '计划日期' | '组织车间';
  defaultVisible: boolean;
  description: string;
}

export const availableOrderFields: OrderFieldOption[] = [
  { key: 'so', label: '销售订单', category: '业务信息', defaultVisible: true, description: '关联的销售订单编号' },
  { key: 'lineItem', label: '项次', category: '业务信息', defaultVisible: true, description: '销售订单行项次序号' },
  { key: 'customer', label: '客户名称', category: '业务信息', defaultVisible: true, description: '订单终端客户或需求方' },
  { key: 'productCode', label: '产品编码', category: '产品属性', defaultVisible: true, description: '物料/产品唯一编码' },
  { key: 'product', label: '产品名称', category: '产品属性', defaultVisible: true, description: '产品名称及基础规格' },
  { key: 'spec', label: '规格型号', category: '产品属性', defaultVisible: true, description: '详细尺寸规格与材质' },
  { key: 'drawingNo', label: '图号/版本', category: '产品属性', defaultVisible: false, description: '技术图纸编号及版本' },
  { key: 'qty', label: '工单计划数', category: '业务信息', defaultVisible: true, description: '工单计划生产总量' },
  { key: 'type', label: '工单类型', category: '业务信息', defaultVisible: true, description: '自制/委外/打样等类型' },
  { key: 'priority', label: '优先级', category: '业务信息', defaultVisible: true, description: '紧急/高/中/低' },
  { key: 'plannedStart', label: '计划开工日期', category: '计划日期', defaultVisible: true, description: '工单预计开工时间' },
  { key: 'plannedEnd', label: '计划完工日期', category: '计划日期', defaultVisible: true, description: '工单预计交付/完工时间' },
  { key: 'workshop', label: '生产车间', category: '组织车间', defaultVisible: false, description: '指定生产加工车间' },
  { key: 'department', label: '生产部门', category: '组织车间', defaultVisible: false, description: '所属责任生产部门' },
  { key: 'status', label: '工单状态', category: '业务信息', defaultVisible: false, description: '工单当前排产/生产状态' },
];

interface ProcessOrderItem {
  order: OrderItem;
  quantity: number;
  reportingType: ReportingType;
  remark: string;
  workCenterCode: string;
  workCenterName: string;
  equipmentCode: string;
  equipmentName: string;
  position: string;
  employee: string;
  plannedStartTime: string;
  estimatedEndTime: string;
  isSelected: boolean;
  isPreScheduled?: boolean;
  isSplit?: boolean;
  splitId?: string;
}

interface AggregatedProcess {
  processName: string;
  orders: ProcessOrderItem[];
  defaultReportingType: ReportingType;
  defaultRemark: string;
  defaultWorkCenterCode: string;
  defaultWorkCenterName: string;
  defaultEquipmentCode: string;
  defaultEquipmentName: string;
  defaultPosition: string;
  defaultEmployee: string;
  defaultPlannedStartTime: string;
  defaultEstimatedEndTime: string;
  isExpanded: boolean;
}

// Local Task item representation in Batch Schedule Production Tasks view
export interface BatchGeneratedTask {
  id: string;
  taskCode: string;
  orderNo: string;
  orderProduct: string;
  orderProductCode: string;
  orderCustomer: string;
  orderSo: string;
  orderLineItem: string;
  orderSpec: string;
  orderPriority: TaskPriority;
  processName: string;
  stepIdx: number;
  workCenterCode: string;
  workCenterName: string;
  equipmentCode: string;
  equipmentName: string;
  position: string;
  employee: string;
  requiredQuantity: number;
  completedQuantity: number;
  reportingType: ReportingType;
  plannedStartTime: string;
  estimatedEndTime: string;
  remark: string;
  status: ProductionTaskStatus;
  isDispatched: boolean;
  isCancelled?: boolean;
}

export default function BatchScheduleModal({
  isOpen,
  onClose,
  selectedOrders,
  onConfirmSchedule
}: BatchScheduleModalProps) {
  // Main Tab Navigation: 'PLAN' (排产计划) vs 'TASKS' (生产任务)
  const [activeMainTab, setActiveMainTab] = useState<'PLAN' | 'TASKS'>('PLAN');

  // Sub-view inside 'PLAN': 'PROCESS' (工序聚合视图) vs 'ORDER' (工单视图)
  const [planViewMode, setPlanViewMode] = useState<'PROCESS' | 'ORDER'>('PROCESS');

  // Order View Sub-states
  const [orderViewSearchTerm, setOrderViewSearchTerm] = useState('');
  const [orderViewPriorityFilter, setOrderViewPriorityFilter] = useState('ALL');
  const [orderExpandedMap, setOrderExpandedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    selectedOrders.forEach(o => { map[o.no] = true; });
    return map;
  });

  // Field Configuration state
  const [visibleFieldKeys, setVisibleFieldKeys] = useState<Set<string>>(() => {
    return new Set(availableOrderFields.filter(f => f.defaultVisible).map(f => f.key));
  });
  const [isFieldConfigOpen, setIsFieldConfigOpen] = useState(false);

  // Filter out any orders that are completely scheduled, and collect partially unscheduled ones
  const { validOrders, fullyScheduledOrders, partialOrders } = useMemo(() => {
    const valid: OrderItem[] = [];
    const fully: OrderItem[] = [];
    const partial: OrderItem[] = [];

    selectedOrders.forEach(order => {
      const allScheduled = order.processes.length > 0 && 
        order.processes.every(p => order.scheduledProcessMap?.[p]);
      const someScheduled = order.processes.some(p => order.scheduledProcessMap?.[p]);

      if (allScheduled || order.status === '已排产') {
        fully.push(order);
      } else {
        valid.push(order);
        if (someScheduled) {
          partial.push(order);
        }
      }
    });

    return { validOrders: valid, fullyScheduledOrders: fully, partialOrders: partial };
  }, [selectedOrders]);

  // Base date for scheduling
  const todayStr = '2026-08-25';

  const standardEquipments = [
    { code: 'EQ-01', name: '设备1# (高精数控)' },
    { code: 'EQ-02', name: '设备2# (标准数控)' },
    { code: 'EQ-03', name: '设备3# (自动车床)' },
    { code: 'EQ-04', name: '设备4# (精密铣床)' },
    { code: 'EQ-05', name: '设备5# (线切割机)' },
  ];

  // Split task modal state
  const [splitTarget, setSplitTarget] = useState<{ processName: string; child: ProcessOrderItem } | null>(null);
  const [splitRows, setSplitRows] = useState<Array<{
    id: string;
    equipmentCode: string;
    equipmentName: string;
    workCenterCode: string;
    workCenterName: string;
    position: string;
    employee: string;
    quantity: number;
    plannedStartTime: string;
    estimatedEndTime: string;
    remark: string;
  }>>([]);
  const [selectedSplitRowIds, setSelectedSplitRowIds] = useState<Set<string>>(new Set());

  // Group processes across valid orders (default collapsed)
  const initialGroupedProcesses = useMemo(() => {
    const map = new Map<string, AggregatedProcess>();

    validOrders.forEach(order => {
      order.processes.forEach(processName => {
        // Skip process if this specific process in this order was already scheduled
        const isProcessAlreadyDone = !!order.scheduledProcessMap?.[processName];
        if (isProcessAlreadyDone) return;

        if (!map.has(processName)) {
          const recWc = getRecommendedWorkCenter(processName);
          const recEmp = getRecommendedEmployee(processName);
          map.set(processName, {
            processName,
            orders: [],
            defaultReportingType: 'PIECE',
            defaultRemark: '',
            defaultWorkCenterCode: recWc.code,
            defaultWorkCenterName: recWc.name,
            defaultEquipmentCode: 'EQ-01',
            defaultEquipmentName: '设备1# (高精数控)',
            defaultPosition: recEmp.position,
            defaultEmployee: recEmp.name,
            defaultPlannedStartTime: `${todayStr}T08:30`,
            defaultEstimatedEndTime: `${todayStr}T17:30`,
            isExpanded: true // Expand for clear visibility in full page
          });
        }

        const group = map.get(processName)!;
        group.orders.push({
          order,
          quantity: order.qty,
          reportingType: group.defaultReportingType,
          remark: group.defaultRemark,
          workCenterCode: group.defaultWorkCenterCode,
          workCenterName: group.defaultWorkCenterName,
          equipmentCode: group.defaultEquipmentCode,
          equipmentName: group.defaultEquipmentName,
          position: group.defaultPosition,
          employee: group.defaultEmployee,
          plannedStartTime: group.defaultPlannedStartTime,
          estimatedEndTime: group.defaultEstimatedEndTime,
          isSelected: true,
          isPreScheduled: false
        });
      });
    });

    return Array.from(map.values());
  }, [validOrders]);

  const [processes, setProcesses] = useState<AggregatedProcess[]>(initialGroupedProcesses);

  // Sync state if initialGroupedProcesses changes
  useEffect(() => {
    setProcesses(initialGroupedProcesses);
  }, [initialGroupedProcesses]);

  // Production tasks state generated during this session or existing for these orders
  const [sessionTasks, setSessionTasks] = useState<BatchGeneratedTask[]>(() => {
    const existingProductionTasks = getProductionTasks();
    const tasks: BatchGeneratedTask[] = [];

    // Pre-populate if orders have tasks in store
    selectedOrders.forEach(order => {
      const related = existingProductionTasks.filter(pt => pt.moNo === order.no);
      related.forEach((pt, idx) => {
        tasks.push({
          id: pt.id,
          taskCode: pt.taskCode,
          orderNo: order.no,
          orderProduct: order.product,
          orderProductCode: order.productCode,
          orderCustomer: order.customer,
          orderSo: order.so,
          orderLineItem: order.lineItem || '01',
          orderSpec: order.spec || '标准规格',
          orderPriority: (order.priority || '中') as TaskPriority,
          processName: pt.opName || '工序加工',
          stepIdx: idx + 1,
          workCenterCode: pt.workStationCode || 'WS-01',
          workCenterName: pt.workStationName || '标准工作站',
          equipmentCode: 'EQ-01',
          equipmentName: '标准设备1#',
          position: pt.position || '操作工',
          employee: pt.employee || '指派员工',
          requiredQuantity: pt.requiredQuantity || order.qty,
          completedQuantity: pt.completedQuantity || 0,
          reportingType: 'PIECE',
          plannedStartTime: pt.plannedStartTime || '2026-08-25 08:30',
          estimatedEndTime: pt.estimatedEndTime || '2026-08-25 17:30',
          remark: pt.remark || '',
          status: pt.status,
          isDispatched: pt.status !== '待下发',
          isCancelled: pt.status === '取消'
        });
      });
    });

    return tasks;
  });

  // Production Tasks Tab States
  const [selectedWorkOrderNo, setSelectedWorkOrderNo] = useState<string | 'ALL'>('ALL');
  const [selectedWorkOrderNos, setSelectedWorkOrderNos] = useState<Set<string>>(() => new Set(selectedOrders.map(o => o.no)));
  const [taskSubTab, setTaskSubTab] = useState<'UNISSUED' | 'DISPATCHED'>('UNISSUED');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [taskSearchKeyword, setTaskSearchKeyword] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('ALL');
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  // Secondary delete notice modal state
  const [showDeleteNoticeModal, setShowDeleteNoticeModal] = useState(false);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null);

  // Toast notice state
  const [notificationToast, setNotificationToast] = useState<{
    type: 'success' | 'info' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  const showToast = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setNotificationToast({ title, message, type });
    setTimeout(() => {
      setNotificationToast(null);
    }, 4000);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuTaskId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Field Configuration Helpers
  const toggleFieldVisibility = (fieldKey: string) => {
    setVisibleFieldKeys(prev => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        if (next.size <= 1) {
          showToast('无法清空', '请至少保留一个展示字段', 'warning');
          return prev;
        }
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const handleSelectAllFields = () => {
    setVisibleFieldKeys(new Set(availableOrderFields.map(f => f.key)));
  };

  const handleResetDefaultFields = () => {
    setVisibleFieldKeys(new Set(availableOrderFields.filter(f => f.defaultVisible).map(f => f.key)));
  };

  // Helper to render order field value (Read-only)
  const getOrderFieldValue = (order: OrderItem, key: string): string => {
    switch (key) {
      case 'so': return order.so || '-';
      case 'lineItem': return order.lineItem || '01';
      case 'customer': return order.customer || '-';
      case 'productCode': return order.productCode || '-';
      case 'product': return order.product || '-';
      case 'spec': return order.spec || '标准规格';
      case 'drawingNo': return order.drawingNo || '-';
      case 'qty': return `${order.qty} 台`;
      case 'type': return order.type || '自制';
      case 'priority': return order.priority || '中';
      case 'plannedStart': return order.plannedStart || '-';
      case 'plannedEnd': return order.plannedEnd || '-';
      case 'workshop': return order.workshop || '机加一车间';
      case 'department': return order.department || '机加部';
      case 'status': return order.status || '待排产';
      default: return '-';
    }
  };

  // Toggle order checkbox inside process
  const toggleOrderSelection = (processName: string, orderNo: string, splitId?: string) => {
    setProcesses(prev => prev.map(p => {
      if (p.processName !== processName) return p;
      return {
        ...p,
        orders: p.orders.map(o => {
          const isMatch = o.order.no === orderNo && (splitId ? o.splitId === splitId : !o.splitId);
          return isMatch ? { ...o, isSelected: !o.isSelected } : o;
        })
      };
    }));
  };

  // Update a single process parameter in Order View
  const updateOrderProcessParam = (
    processName: string,
    orderNo: string,
    splitId: string | undefined,
    updates: Partial<ProcessOrderItem>
  ) => {
    setProcesses(prev => prev.map(p => {
      if (p.processName !== processName) return p;
      return {
        ...p,
        orders: p.orders.map(o => {
          const isMatch = o.order.no === orderNo && (splitId ? o.splitId === splitId : !o.splitId);
          return isMatch ? { ...o, ...updates } : o;
        })
      };
    }));
  };

  // Batch update all processes of a specific order in Order View
  const batchUpdateOrderProcesses = (orderNo: string, updates: Partial<ProcessOrderItem>) => {
    setProcesses(prev => prev.map(p => ({
      ...p,
      orders: p.orders.map(o => o.order.no === orderNo ? { ...o, ...updates } : o)
    })));
  };

  // Toggle all processes of a specific order (Select all / Deselect all)
  const toggleAllProcessesOfOrder = (orderNo: string, isSelected: boolean) => {
    setProcesses(prev => prev.map(p => ({
      ...p,
      orders: p.orders.map(o => o.order.no === orderNo ? { ...o, isSelected } : o)
    })));
  };

  // Aggregated Order View Data calculated from current processes state
  const ordersForPlanView = useMemo(() => {
    return validOrders.map(order => {
      const orderProcesses: Array<{
        processName: string;
        procIdx: number;
        child: ProcessOrderItem;
      }> = [];

      processes.forEach((proc, procIdx) => {
        proc.orders.forEach(child => {
          if (child.order.no === order.no) {
            orderProcesses.push({
              processName: proc.processName,
              procIdx: procIdx + 1,
              child
            });
          }
        });
      });

      const totalCount = orderProcesses.length;
      const selectedCount = orderProcesses.filter(op => op.child.isSelected).length;
      const allSelected = totalCount > 0 && selectedCount === totalCount;
      const someSelected = selectedCount > 0 && selectedCount < totalCount;
      const totalScheduledQty = orderProcesses.filter(op => op.child.isSelected).reduce((sum, op) => sum + (Number(op.child.quantity) || 0), 0);

      return {
        order,
        processes: orderProcesses,
        totalCount,
        selectedCount,
        allSelected,
        someSelected,
        totalScheduledQty
      };
    }).filter(item => {
      // Search term filter
      if (orderViewSearchTerm) {
        const term = orderViewSearchTerm.toLowerCase();
        const matchNo = item.order.no.toLowerCase().includes(term);
        const matchProd = item.order.product.toLowerCase().includes(term) || item.order.productCode.toLowerCase().includes(term);
        const matchCust = (item.order.customer || '').toLowerCase().includes(term);
        const matchSo = (item.order.so || '').toLowerCase().includes(term);
        if (!matchNo && !matchProd && !matchCust && !matchSo) return false;
      }
      // Priority filter
      if (orderViewPriorityFilter !== 'ALL' && item.order.priority !== orderViewPriorityFilter) {
        return false;
      }
      return true;
    });
  }, [validOrders, processes, orderViewSearchTerm, orderViewPriorityFilter]);

  // Global Action: Smart recommend equipment, positions and operators
  const handleSmartRecommendAll = () => {
    setProcesses(prev => prev.map(p => {
      const recWc = getRecommendedWorkCenter(p.processName);
      const recEmp = getRecommendedEmployee(p.processName);
      return {
        ...p,
        defaultWorkCenterCode: recWc.code,
        defaultWorkCenterName: recWc.name,
        defaultPosition: recEmp.position,
        defaultEmployee: recEmp.name,
        orders: p.orders.map(o => ({
          ...o,
          workCenterCode: recWc.code,
          workCenterName: recWc.name,
          position: recEmp.position,
          employee: recEmp.name
        }))
      };
    }));
    showToast('智能分配完成', '已根据工序特征智能匹配推荐工作站、设备及人员。', 'success');
  };

  // Open split modal
  const handleOpenSplit = (processName: string, child: ProcessOrderItem) => {
    const q1 = Math.max(1, Math.floor(child.quantity / 2));
    const q2 = child.quantity - q1;
    const recEmp = getRecommendedEmployee(processName);

    setSplitTarget({ processName, child });
    setSplitRows([
      {
        id: '1',
        equipmentCode: child.equipmentCode || 'EQ-01',
        equipmentName: child.equipmentName || '设备1# (高精数控)',
        workCenterCode: child.workCenterCode,
        workCenterName: child.workCenterName,
        position: child.position,
        employee: child.employee,
        quantity: q1 > 0 ? q1 : child.quantity,
        plannedStartTime: child.plannedStartTime,
        estimatedEndTime: child.estimatedEndTime,
        remark: `${child.remark ? child.remark + ' ' : ''}[批次1]`
      },
      {
        id: '2',
        equipmentCode: 'EQ-02',
        equipmentName: '设备2# (标准数控)',
        workCenterCode: child.workCenterCode,
        workCenterName: child.workCenterName,
        position: recEmp.position,
        employee: recEmp.name !== child.employee ? recEmp.name : '李师傅',
        quantity: q2 > 0 ? q2 : 1,
        plannedStartTime: child.plannedStartTime,
        estimatedEndTime: child.estimatedEndTime,
        remark: `${child.remark ? child.remark + ' ' : ''}[批次2]`
      }
    ]);
    setSelectedSplitRowIds(new Set());
  };

  // Confirm split modal
  const handleConfirmSplit = () => {
    if (!splitTarget) return;
    const totalSplitQuantity = splitRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    if (totalSplitQuantity !== splitTarget.child.quantity) {
      showToast('拆分数量不匹配', `拆分数量之和 (${totalSplitQuantity}) 必须等于原需求数量 (${splitTarget.child.quantity})`, 'warning');
      return;
    }

    setProcesses(prev => prev.map(p => {
      if (p.processName !== splitTarget.processName) return p;

      const newOrders: ProcessOrderItem[] = [];
      p.orders.forEach(o => {
        if (o.order.no === splitTarget.child.order.no && (!splitTarget.child.splitId || o.splitId === splitTarget.child.splitId)) {
          // Replace with split rows
          splitRows.forEach((r, rIdx) => {
            newOrders.push({
              ...o,
              quantity: r.quantity,
              workCenterCode: r.workCenterCode,
              workCenterName: r.workCenterName,
              equipmentCode: r.equipmentCode,
              equipmentName: r.equipmentName,
              position: r.position,
              employee: r.employee,
              plannedStartTime: r.plannedStartTime,
              estimatedEndTime: r.estimatedEndTime,
              remark: r.remark,
              isSplit: true,
              splitId: `split-${Date.now()}-${rIdx}`
            });
          });
        } else {
          newOrders.push(o);
        }
      });

      return {
        ...p,
        orders: newOrders
      };
    }));

    setSplitTarget(null);
    showToast('拆分成功', `工单「${splitTarget.child.order.no}」工序已拆分为 ${splitRows.length} 个生产任务批次。`, 'success');
  };

  // PRIMARY ACTION: "生成排产计划" (Renamed from "生成任务")
  const handleGenerateSchedulePlan = () => {
    let totalGeneratedPlanCount = 0;
    const touchedOrderMap = new Map<string, OrderItem>();
    const newGeneratedTasks: BatchGeneratedTask[] = [];

    processes.forEach((proc, procIdx) => {
      proc.orders.forEach((child, childIdx) => {
        if (!child.isSelected) return;

        const order = child.order;
        if (!touchedOrderMap.has(order.no)) {
          touchedOrderMap.set(order.no, {
            ...order,
            status: '进行中',
            scheduledProcessMap: { ...(order.scheduledProcessMap || {}) }
          });
        }

        const targetOrder = touchedOrderMap.get(order.no)!;
        targetOrder.scheduledProcessMap[proc.processName] = true;

        // Build schedule plan item and persist
        const planKey = `plan-${order.no}-${proc.processName}${child.splitId ? `-${child.splitId}` : ''}`;
        const planItem: SchedulePlanItem = {
          id: planKey,
          nodeId: `order-${order.no}`,
          opId: `op-${order.no}-${procIdx}`,
          materialCode: order.productCode,
          materialName: order.product,
          opName: proc.processName,
          stepIdx: procIdx + 1,
          scheduledQuantity: Number(child.quantity) || 1,
          reportingType: child.reportingType || 'PIECE',
          remark: child.remark || '',
          workCenterCode: child.workCenterCode,
          workCenterName: child.workCenterName,
          equipmentCode: child.equipmentCode,
          equipmentName: child.equipmentName,
          position: child.position,
          employee: child.employee,
          plannedStartTime: child.plannedStartTime,
          estimatedEndTime: child.estimatedEndTime,
          isScheduled: true,
          isDispatched: false
        };

        saveOrderSchedulePlan(order.no, { [planKey]: planItem });

        // Generate corresponding production task
        const taskCode = `PT-${order.no.replace('MO', '')}-${(procIdx + 1).toString().padStart(2, '0')}${child.splitId ? `-${String.fromCharCode(65 + (childIdx % 26))}` : ''}`;
        
        // Add to global store
        const addedTask = addProductionTask({
          id: `TASK-${Date.now()}-${procIdx}-${childIdx}`,
          taskCode,
          taskName: `${order.product} - ${proc.processName}`,
          priority: (order.priority || '中') as TaskPriority,
          salesOrder: `${order.so} 第${order.lineItem || '01'}项`,
          opName: proc.processName,
          operationName: proc.processName,
          materialName: order.product,
          moNo: order.no,
          workStationCode: child.workCenterCode,
          workStationName: child.workCenterName,
          employee: child.employee,
          position: child.position,
          progress: 0,
          plannedStartTime: `${child.plannedStartTime.replace('T', ' ')}:00`,
          plannedEndTime: `${child.estimatedEndTime.replace('T', ' ')}:00`,
          estimatedEndTime: `${child.estimatedEndTime.replace('T', ' ')}:00`,
          status: '待下发',
          requiredQuantity: Number(child.quantity) || 1,
          completedQuantity: 0,
          remark: child.remark || '',
          reportingType: child.reportingType === 'TIME' ? '进度报工' : '计件报工',
          reportType: child.reportingType === 'TIME' ? '进度报工' : '计件报工'
        });

        // Add to local session tasks
        newGeneratedTasks.push({
          id: addedTask.id,
          taskCode,
          orderNo: order.no,
          orderProduct: order.product,
          orderProductCode: order.productCode,
          orderCustomer: order.customer,
          orderSo: order.so,
          orderLineItem: order.lineItem || '01',
          orderSpec: order.spec || '标准规格',
          orderPriority: (order.priority || '中') as TaskPriority,
          processName: proc.processName,
          stepIdx: procIdx + 1,
          workCenterCode: child.workCenterCode,
          workCenterName: child.workCenterName,
          equipmentCode: child.equipmentCode,
          equipmentName: child.equipmentName,
          position: child.position,
          employee: child.employee,
          requiredQuantity: Number(child.quantity) || 1,
          completedQuantity: 0,
          reportingType: child.reportingType,
          plannedStartTime: child.plannedStartTime,
          estimatedEndTime: child.estimatedEndTime,
          remark: child.remark,
          status: '待下发',
          isDispatched: false
        });

        totalGeneratedPlanCount++;
      });
    });

    // Update orders list
    const updatedOrdersList: OrderItem[] = Array.from(touchedOrderMap.values()).map(o => {
      const allDone = o.processes.every(p => o.scheduledProcessMap[p]);
      return {
        ...o,
        status: '进行中',
        overallProgress: allDone ? Math.max(o.overallProgress, 20) : o.overallProgress
      };
    });

    // Update local tasks
    setSessionTasks(prev => [...newGeneratedTasks, ...prev]);

    // Switch to Production Tasks tab to view the generated tasks organized by work order!
    setActiveMainTab('TASKS');
    setTaskSubTab('UNISSUED');

    showToast(
      '排产计划已生成！',
      `共生成 ${totalGeneratedPlanCount} 项排产计划与生产任务。已切换至「生产任务」页签，可按工单视角查看与下发。`,
      'success'
    );

    // Also notify parent
    onConfirmSchedule(updatedOrdersList, updatedOrdersList.length, totalGeneratedPlanCount);
  };

  // Dispatch single task
  const handleDispatchSingleTask = (task: BatchGeneratedTask) => {
    updateProductionTaskStatus(task.id, '待生产');
    setSessionTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: '待生产', isDispatched: true } : t));
    showToast('任务下发成功', `生产任务「${task.taskCode}」已下发至车间待生产。`, 'success');
  };

  // Batch dispatch tasks by selected tasks
  const handleBatchDispatchTasks = () => {
    if (selectedTaskIds.size === 0) return;
    const ids: string[] = Array.from(selectedTaskIds);
    batchUpdateProductionTaskStatus(ids, '待生产');
    setSessionTasks(prev => prev.map(t => selectedTaskIds.has(t.id) ? { ...t, status: '待生产', isDispatched: true } : t));
    showToast('批量下发成功', `已成功下发选中的 ${ids.length} 个生产任务。`, 'success');
    setSelectedTaskIds(new Set<string>());
  };

  // Batch dispatch all unissued tasks for selected work orders
  const handleBatchDispatchByWorkOrders = () => {
    if (selectedWorkOrderNos.size === 0) {
      showToast('请先勾选工单', '请至少勾选一个工单以批量下发任务。', 'warning');
      return;
    }
    const pendingTasksToDispatch = sessionTasks.filter(
      t => selectedWorkOrderNos.has(t.orderNo) && !t.isDispatched && t.status === '待下发'
    );
    if (pendingTasksToDispatch.length === 0) {
      showToast('暂无待下发任务', '所勾选的工单下没有待下发的生产任务（可能已全部下发或未生成）。', 'info');
      return;
    }
    const ids = pendingTasksToDispatch.map(t => t.id);
    batchUpdateProductionTaskStatus(ids, '待生产');
    setSessionTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: '待生产', isDispatched: true } : t));
    showToast(
      '工单任务批量下发成功',
      `已成功下发已选 ${selectedWorkOrderNos.size} 个工单下的全部 ${ids.length} 个待下发生产任务。`,
      'success'
    );
  };

  // Single work order: Dispatch all unissued tasks
  const handleDispatchWorkOrderAllTasks = (orderNo: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const pendingTasks = sessionTasks.filter(t => t.orderNo === orderNo && !t.isDispatched && t.status === '待下发');
    if (pendingTasks.length === 0) {
      showToast('暂无待下发任务', `工单「${orderNo}」下没有待下发的生产任务。`, 'info');
      return;
    }
    const ids = pendingTasks.map(t => t.id);
    batchUpdateProductionTaskStatus(ids, '待生产');
    setSessionTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: '待生产', isDispatched: true } : t));
    showToast('工单任务下发成功', `工单「${orderNo}」的 ${ids.length} 个待下发生产任务已全部下发。`, 'success');
  };

  // Dispatch all unissued tasks currently in view / on the page
  const handleDispatchAllCurrentViewTasks = () => {
    if (currentViewUnissuedTasks.length === 0) {
      showToast('暂无待下发任务', '当前页面/筛选条件下没有待下发的生产任务。', 'info');
      return;
    }
    const ids = currentViewUnissuedTasks.map(t => t.id);
    batchUpdateProductionTaskStatus(ids, '待生产');
    setSessionTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: '待生产', isDispatched: true } : t));
    showToast(
      '任务下发成功',
      `已成功将当前页面的全部 ${ids.length} 个生产任务下发至车间待生产。`,
      'success'
    );
  };

  // Cancel dispatched task (releases schedule quantity back to plan, hides from dispatched)
  const handleCancelDispatchedTask = (task: BatchGeneratedTask) => {
    updateProductionTaskStatus(task.id, '取消');
    setSessionTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: '取消', isDispatched: false, isCancelled: true } : t));
    
    // Release schedule plan item
    const planKey = `plan-${task.orderNo}-${task.processName}`;
    saveOrderSchedulePlan(task.orderNo, {
      [planKey]: {
        id: planKey,
        nodeId: `order-${task.orderNo}`,
        opId: `op-${task.orderNo}`,
        scheduledQuantity: task.requiredQuantity,
        isScheduled: false,
        isDispatched: false
      }
    });

    showToast('任务已取消', `生产任务「${task.taskCode}」已取消，已释放排产数量回计划池。`, 'info');
  };

  // Trigger delete notice modal
  const handleDeleteTaskClick = (taskId: string) => {
    setPendingDeleteTaskId(taskId);
    setShowDeleteNoticeModal(true);
    setOpenMenuTaskId(null);
  };

  // Confirm delete task
  const handleConfirmDeleteTask = () => {
    if (pendingDeleteTaskId) {
      deleteProductionTask(pendingDeleteTaskId);
      setSessionTasks(prev => prev.filter(t => t.id !== pendingDeleteTaskId));
      showToast('删除成功', '生产任务记录已删除。', 'info');
    }
    setShowDeleteNoticeModal(false);
    setPendingDeleteTaskId(null);
  };

  // Filter tasks in Production Tasks tab
  const filteredTasks = useMemo(() => {
    return sessionTasks.filter(task => {
      // Filter by selected work order
      if (selectedWorkOrderNo !== 'ALL' && task.orderNo !== selectedWorkOrderNo) {
        return false;
      }
      // Filter by dispatch sub-tab
      if (taskSubTab === 'UNISSUED' && (task.isDispatched || task.status === '待生产' || task.status === '生产中' || task.status === '已完成')) {
        return false;
      }
      if (taskSubTab === 'DISPATCHED' && (!task.isDispatched && task.status === '待下发')) {
        return false;
      }
      // Filter by keyword
      if (taskSearchKeyword) {
        const kw = taskSearchKeyword.toLowerCase();
        const match = task.taskCode.toLowerCase().includes(kw) ||
          task.processName.toLowerCase().includes(kw) ||
          task.orderNo.toLowerCase().includes(kw) ||
          task.orderProduct.toLowerCase().includes(kw) ||
          task.workCenterName.toLowerCase().includes(kw) ||
          task.employee.toLowerCase().includes(kw);
        if (!match) return false;
      }
      // Filter by priority
      if (taskPriorityFilter !== 'ALL' && task.orderPriority !== taskPriorityFilter) {
        return false;
      }
      return true;
    });
  }, [sessionTasks, selectedWorkOrderNo, taskSubTab, taskSearchKeyword, taskPriorityFilter]);

  // Tasks in current view that are pending dispatch (待下发)
  const currentViewUnissuedTasks = useMemo(() => {
    return sessionTasks.filter(task => {
      if (task.isDispatched || task.status !== '待下发') return false;
      if (selectedWorkOrderNo !== 'ALL' && task.orderNo !== selectedWorkOrderNo) return false;
      if (taskPriorityFilter !== 'ALL' && task.orderPriority !== taskPriorityFilter) return false;
      if (taskSearchKeyword) {
        const kw = taskSearchKeyword.toLowerCase();
        const match = task.taskCode.toLowerCase().includes(kw) ||
          task.processName.toLowerCase().includes(kw) ||
          task.orderNo.toLowerCase().includes(kw) ||
          task.orderProduct.toLowerCase().includes(kw) ||
          task.workCenterName.toLowerCase().includes(kw) ||
          task.employee.toLowerCase().includes(kw);
        if (!match) return false;
      }
      return true;
    });
  }, [sessionTasks, selectedWorkOrderNo, taskPriorityFilter, taskSearchKeyword]);

  // Statistics for Work Orders in Production Tasks Tab
  const orderTaskStats = useMemo(() => {
    const map = new Map<string, { total: number; unissued: number; dispatched: number }>();
    selectedOrders.forEach(o => {
      map.set(o.no, { total: 0, unissued: 0, dispatched: 0 });
    });

    sessionTasks.forEach(task => {
      if (!map.has(task.orderNo)) {
        map.set(task.orderNo, { total: 0, unissued: 0, dispatched: 0 });
      }
      const stats = map.get(task.orderNo)!;
      stats.total++;
      if (!task.isDispatched && task.status === '待下发') {
        stats.unissued++;
      } else {
        stats.dispatched++;
      }
    });

    return map;
  }, [selectedOrders, sessionTasks]);

  const totalUnissuedCount = sessionTasks.filter(t => !t.isDispatched && t.status === '待下发').length;
  const totalDispatchedCount = sessionTasks.filter(t => t.isDispatched || t.status !== '待下发').length;
  const selectedOrdersUnissuedTasksCount = useMemo(() => {
    return sessionTasks.filter(t => selectedWorkOrderNos.has(t.orderNo) && !t.isDispatched && t.status === '待下发').length;
  }, [sessionTasks, selectedWorkOrderNos]);

  const totalOrdersInvolved = validOrders.length;
  const totalProcessesCount = processes.length;
  const totalPiecesCount = processes.reduce((acc, proc) => {
    return acc + proc.orders.filter(o => o.isSelected).reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);
  }, 0);

  // If modal is not open, return null after all hooks have run consistently
  if (!isOpen) return null;

  // If no valid orders could be scheduled
  if (validOrders.length === 0 && sessionTasks.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">所选工单无需排产</h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              您勾选的工单 <strong className="text-slate-800 font-mono">({fullyScheduledOrders.map(o => o.no).join(', ')})</strong> 所有工序均已完成排产，不支持重复排产。
            </p>
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 text-left mb-6 border border-slate-200">
              <div className="font-semibold text-slate-700 mb-1">💡 规则说明：</div>
              • 已排产工单不支持重复批量排产。<br />
              • 如需调整已排产工单，请进入该工单详情页进行单独微调。
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#f8fafc] flex flex-col w-full h-full overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. TOP HEADER: Navigation, Breadcrumb, Tabs & Field Config */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex items-center justify-between shadow-2xs z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="返回工单列表"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回工单列表</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Breadcrumb & Title */}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>工单管理</span>
              <span>/</span>
              <span className="text-slate-800 font-semibold">批量排产</span>
            </div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              批量排产工作台
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                已选中 {selectedOrders.length} 个工单
              </span>
            </h1>
          </div>
        </div>

        {/* Primary Tab Switcher: 【排产计划】 & 【生产任务】 */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveMainTab('PLAN')}
            className={cn(
              "flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeMainTab === 'PLAN'
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>排产计划</span>
            <span className="bg-blue-50 text-blue-600 text-[11px] px-1.5 py-0.2 rounded-full font-mono border border-blue-100">
              {totalProcessesCount} 道工序
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('TASKS')}
            className={cn(
              "flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeMainTab === 'TASKS'
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <Activity className="w-4 h-4 text-purple-600" />
            <span>生产任务</span>
            <span className={cn(
              "text-[11px] px-1.5 py-0.2 rounded-full font-mono border",
              sessionTasks.length > 0
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-slate-200/80 text-slate-500 border-slate-300"
            )}>
              {sessionTasks.length} 个任务
            </span>
          </button>
        </div>

        {/* Right Tools: Field Config & Close */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsFieldConfigOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="配置整个页面展示的工单扩展字段"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>字段配置</span>
            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded text-[10px] font-bold border border-blue-100">
              {visibleFieldKeys.size}
            </span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="关闭并退出"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT: BASED ON ACTIVE TAB */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ========================================================================= */}
        {/* TAB 1: 【排产计划】 (Scheduling Plan Tab)                                 */}
        {/* ========================================================================= */}
        {activeMainTab === 'PLAN' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Top Validation & Status Notice Banner */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="text-slate-500">参与排产工单：</span>
                  <span className="font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-mono">
                    {totalOrdersInvolved} 个工单
                  </span>
                  <span className="text-slate-400">
                    ({validOrders.map(o => o.no).slice(0, 3).join(', ')}{validOrders.length > 3 ? '...' : ''})
                  </span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="text-slate-500">聚合工序：</span>
                  <strong className="text-slate-800">{totalProcessesCount} 种</strong>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="text-slate-500">排产总数量：</span>
                  <strong className="text-emerald-700 font-mono">{totalPiecesCount} 台</strong>
                </div>
              </div>

              {/* Dynamic validation alerts */}
              <div className="flex items-center gap-2 text-[11px] flex-wrap">
                {fullyScheduledOrders.length > 0 && (
                  <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    已自动剔除 {fullyScheduledOrders.length} 个已排产工单
                  </span>
                )}
                {partialOrders.length > 0 && (
                  <span className="text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    已智能提取 {partialOrders.length} 个进行中工单的未排产工序
                  </span>
                )}
              </div>
            </div>

            {/* Global Toolbar with View Switcher (工序聚合视图 vs 工单视图) */}
            <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Left View Switcher Tabs */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setPlanViewMode('PROCESS')}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      planViewMode === 'PROCESS'
                        ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>工序聚合视图</span>
                    <span className="text-[11px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded-full font-mono border border-blue-100">
                      {totalProcessesCount} 道
                    </span>
                  </button>

                  <button
                    onClick={() => setPlanViewMode('ORDER')}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      planViewMode === 'ORDER'
                        ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    )}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    <span>工单视图</span>
                    <span className="text-[11px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-mono border border-indigo-100">
                      {validOrders.length} 个工单
                    </span>
                  </button>
                </div>

                <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  {planViewMode === 'PROCESS' ? (
                    <span>按工序自动聚合跨工单批次，支持单道工序统一派工</span>
                  ) : (
                    <span>按工单维度展开全流程工序，支持单个工单及各工序精准调度</span>
                  )}
                </div>
              </div>

              {/* Right Tools: Search, Filter, Expand/Collapse & Smart Recommend */}
              <div className="flex items-center gap-2 flex-wrap">
                {planViewMode === 'ORDER' && (
                  <>
                    {/* Search in Order View */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="搜索工单/产品/客户/SO..."
                        value={orderViewSearchTerm}
                        onChange={(e) => setOrderViewSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white w-44 transition-all"
                      />
                      {orderViewSearchTerm && (
                        <button
                          onClick={() => setOrderViewSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Priority Filter in Order View */}
                    <select
                      value={orderViewPriorityFilter}
                      onChange={(e) => setOrderViewPriorityFilter(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="ALL">全部优先级</option>
                      <option value="紧急">紧急</option>
                      <option value="高">高</option>
                      <option value="中">中</option>
                      <option value="低">低</option>
                    </select>
                  </>
                )}

                <button
                  onClick={handleSmartRecommendAll}
                  className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="根据工序特征智能匹配推荐工作站、设备及主操员工"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>智能推荐分配</span>
                </button>

                <div className="h-4 w-px bg-slate-200" />

                {planViewMode === 'PROCESS' ? (
                  <>
                    <button 
                      onClick={() => setProcesses(prev => prev.map(p => ({ ...p, isExpanded: true })))}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                    >
                      全部展开
                    </button>
                    <button 
                      onClick={() => setProcesses(prev => prev.map(p => ({ ...p, isExpanded: false })))}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                    >
                      全部折叠
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        const map: Record<string, boolean> = {};
                        validOrders.forEach(o => { map[o.no] = true; });
                        setOrderExpandedMap(map);
                      }}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                    >
                      全部展开
                    </button>
                    <button 
                      onClick={() => {
                        const map: Record<string, boolean> = {};
                        validOrders.forEach(o => { map[o.no] = false; });
                        setOrderExpandedMap(map);
                      }}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                    >
                      全部折叠
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Core Scheduling List Area: Render based on planViewMode */}
            {planViewMode === 'PROCESS' ? (
              /* VIEW MODE 1: PROCESS AGGREGATED VIEW (工序聚合视图) */
              <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60 custom-scrollbar space-y-4">
                {processes.map((proc, pIdx) => {
                  const selectedChildren = proc.orders.filter(o => o.isSelected);
                  const totalGroupQuantity = selectedChildren.reduce((s, o) => s + (Number(o.quantity) || 0), 0);

                  const activeOrders = selectedChildren.length > 0 ? selectedChildren : proc.orders;
                  const firstO = activeOrders[0];

                  const isWorkCenterMixed = activeOrders.some(o => o.workCenterCode !== firstO?.workCenterCode);
                  const currentWorkCenterCode = isWorkCenterMixed ? '__MIXED__' : (firstO?.workCenterCode || proc.defaultWorkCenterCode);

                  const isEquipmentMixed = activeOrders.some(o => o.equipmentCode !== firstO?.equipmentCode);
                  const currentEquipmentCode = isEquipmentMixed ? '__MIXED__' : (firstO?.equipmentCode || proc.defaultEquipmentCode);

                  const isPositionMixed = activeOrders.some(o => o.position !== firstO?.position);
                  const currentPosition = isPositionMixed ? '__MIXED__' : (firstO?.position || proc.defaultPosition);

                  const isEmployeeMixed = activeOrders.some(o => o.employee !== firstO?.employee);
                  const currentEmployee = isEmployeeMixed ? '__MIXED__' : (firstO?.employee || proc.defaultEmployee);

                  const isReportingTypeMixed = activeOrders.some(o => o.reportingType !== firstO?.reportingType);
                  const currentReportingType = isReportingTypeMixed ? '__MIXED__' : (firstO?.reportingType || proc.defaultReportingType);

                  return (
                    <div 
                      key={proc.processName}
                      className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200 hover:border-slate-300"
                    >
                      {/* Process Group Header */}
                      <div 
                        className={cn(
                          "px-5 py-3 border-b flex flex-wrap items-center justify-between gap-4 transition-colors",
                          proc.isExpanded ? "bg-slate-50/90 border-slate-200" : "bg-white border-transparent hover:bg-slate-50/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setProcesses(prev => prev.map((p, i) => i === pIdx ? { ...p, isExpanded: !p.isExpanded } : p))}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors cursor-pointer"
                          >
                            {proc.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xs">
                              {pIdx + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">{proc.processName}</span>
                            <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                              {selectedChildren.length}/{proc.orders.length} 个工单
                            </span>
                            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                              合计 {totalGroupQuantity} 台
                            </span>
                          </div>
                        </div>

                        {/* Header Quick Batch Parameters Setting (统一配置控制栏: 纯白背景、无缝一体连接) */}
                        <div className="inline-flex items-center flex-wrap bg-white rounded-lg border border-slate-200 shadow-2xs divide-x divide-slate-200 overflow-hidden">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 px-2.5 py-1.5 bg-white select-none">
                            <Settings2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>统一配置:</span>
                          </div>

                          {/* Work Center */}
                          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                            <span className="text-slate-500 text-[11px] whitespace-nowrap">工作站</span>
                            <select
                              value={currentWorkCenterCode}
                              onChange={(e) => {
                                const code = e.target.value;
                                if (code === '__MIXED__') return;
                                const found = standardWorkCenters.find(w => w.code === code);
                                setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                  ...p,
                                  defaultWorkCenterCode: code,
                                  defaultWorkCenterName: found ? found.name : code,
                                  orders: p.orders.map(o => ({ ...o, workCenterCode: code, workCenterName: found ? found.name : code }))
                                } : p));
                              }}
                              className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[95px] cursor-pointer hover:bg-slate-50 border-0"
                            >
                              {isWorkCenterMixed && <option value="__MIXED__">多选不同值</option>}
                              {standardWorkCenters.map(wc => (
                                <option key={wc.code} value={wc.code}>{wc.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Equipment */}
                          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                            <span className="text-slate-500 text-[11px] whitespace-nowrap">设备</span>
                            <select
                              value={currentEquipmentCode}
                              onChange={(e) => {
                                const code = e.target.value;
                                if (code === '__MIXED__') return;
                                const found = standardEquipments.find(eq => eq.code === code);
                                setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                  ...p,
                                  defaultEquipmentCode: code,
                                  defaultEquipmentName: found ? found.name : code,
                                  orders: p.orders.map(o => ({ ...o, equipmentCode: code, equipmentName: found ? found.name : code }))
                                } : p));
                              }}
                              className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[90px] cursor-pointer hover:bg-slate-50 border-0"
                            >
                              {isEquipmentMixed && <option value="__MIXED__">多选不同值</option>}
                              {standardEquipments.map(eq => (
                                <option key={eq.code} value={eq.code}>{eq.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Position */}
                          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                            <span className="text-slate-500 text-[11px] whitespace-nowrap">岗位</span>
                            <select
                              value={currentPosition}
                              onChange={(e) => {
                                const pos = e.target.value;
                                if (pos === '__MIXED__') return;
                                setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                  ...p,
                                  defaultPosition: pos,
                                  orders: p.orders.map(o => ({ ...o, position: pos }))
                                } : p));
                              }}
                              className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[80px] cursor-pointer hover:bg-slate-50 border-0"
                            >
                              {isPositionMixed && <option value="__MIXED__">多选不同值</option>}
                              {standardPositions.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                              ))}
                            </select>
                          </div>

                          {/* Employee */}
                          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                            <span className="text-slate-500 text-[11px] whitespace-nowrap">员工</span>
                            <select
                              value={currentEmployee}
                              onChange={(e) => {
                                const emp = e.target.value;
                                if (emp === '__MIXED__') return;
                                setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                  ...p,
                                  defaultEmployee: emp,
                                  orders: p.orders.map(o => ({ ...o, employee: emp }))
                                } : p));
                              }}
                              className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[75px] cursor-pointer hover:bg-slate-50 border-0"
                            >
                              {isEmployeeMixed && <option value="__MIXED__">多选不同值</option>}
                              {standardEmployees.map(emp => (
                                <option key={emp.name} value={emp.name}>{emp.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Reporting Type */}
                          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                            <span className="text-slate-500 text-[11px] whitespace-nowrap">报工</span>
                            <select
                              value={currentReportingType}
                              onChange={(e) => {
                                const val = e.target.value as ReportingType;
                                if (val === '__MIXED__' as any) return;
                                setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                  ...p,
                                  defaultReportingType: val,
                                  orders: p.orders.map(o => ({ ...o, reportingType: val }))
                                } : p));
                              }}
                              className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[85px] cursor-pointer hover:bg-slate-50 border-0"
                            >
                              {isReportingTypeMixed && <option value="__MIXED__">多选不同值</option>}
                              <option value="PIECE">计件报工</option>
                              <option value="TIME">工时报工</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Child Orders Table with Configured Read-only Fields */}
                      {proc.isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                            <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-2.5 w-9 text-center">
                                  <input
                                    type="checkbox"
                                    checked={proc.orders.length > 0 && proc.orders.every(o => o.isSelected)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                        ...p,
                                        orders: p.orders.map(o => ({ ...o, isSelected: checked }))
                                      } : p));
                                    }}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </th>
                                <th className="py-2 px-2.5 min-w-[140px]">工单号 / 产品</th>
                                
                                {/* Dynamic Configured Read-Only Columns */}
                                {availableOrderFields.filter(f => visibleFieldKeys.has(f.key) && f.key !== 'product' && f.key !== 'productCode').map(f => (
                                  <th key={f.key} className="py-2 px-2.5 bg-slate-100/50 text-slate-700 font-bold whitespace-nowrap">
                                    {f.label}
                                  </th>
                                ))}

                                {/* Editable Scheduling Parameters */}
                                <th className="py-2 px-2.5 min-w-[110px]">工作站</th>
                                <th className="py-2 px-2.5 min-w-[105px]">设备</th>
                                <th className="py-2 px-2.5 min-w-[85px]">岗位</th>
                                <th className="py-2 px-2.5 min-w-[85px]">指派员工</th>
                                <th className="py-2 px-2.5 min-w-[80px] text-center bg-emerald-50/60 text-emerald-900">排产数量</th>
                                <th className="py-2 px-2.5 min-w-[130px] text-center bg-indigo-50/60 text-indigo-900">计划开工时间</th>
                                <th className="py-2 px-2.5 min-w-[130px] text-center bg-indigo-50/60 text-indigo-900">预计完工时间</th>
                                <th className="py-2 px-2.5 min-w-[100px]">备注</th>
                                <th className="py-2 px-2.5 w-20 text-center sticky right-0 bg-slate-50 z-10 border-l border-slate-200">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {proc.orders.map((child, cIdx) => (
                                <tr 
                                  key={`${child.order.no}-${cIdx}-${child.splitId || ''}`}
                                  className={cn(
                                    "transition-colors",
                                    !child.isSelected ? "bg-slate-50/60 opacity-60" : "hover:bg-blue-50/30"
                                  )}
                                >
                                  <td className="py-2 px-2.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={child.isSelected}
                                      onChange={() => toggleOrderSelection(proc.processName, child.order.no, child.splitId)}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>

                                  {/* Order & Product basic block */}
                                  <td className="py-2 px-2.5">
                                    <div className="font-mono font-bold text-blue-600 text-xs flex items-center gap-1">
                                      <span>{child.order.no}</span>
                                      {child.isSplit && (
                                        <span className="bg-purple-100 text-purple-700 text-[10px] px-1 py-0.2 rounded font-sans font-medium">
                                          拆分项
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-slate-800 text-xs font-medium truncate max-w-[160px]" title={child.order.product}>
                                      {child.order.product}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {child.order.productCode}
                                    </div>
                                  </td>

                                  {/* Dynamic Configured Read-only Fields (只展示，不允许修改) */}
                                  {availableOrderFields.filter(f => visibleFieldKeys.has(f.key) && f.key !== 'product' && f.key !== 'productCode').map(f => {
                                    const val = getOrderFieldValue(child.order, f.key);
                                    return (
                                      <td key={f.key} className="py-2 px-2.5 whitespace-nowrap bg-slate-50/30">
                                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100/90 text-slate-700 font-medium text-xs border border-slate-200/80">
                                          {val}
                                        </span>
                                      </td>
                                    );
                                  })}

                                  {/* Work Center */}
                                  <td className="py-2 px-2.5">
                                    <select
                                      value={child.workCenterCode}
                                      onChange={(e) => {
                                        const code = e.target.value;
                                        const found = standardWorkCenters.find(w => w.code === code);
                                        setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                          ...p,
                                          orders: p.orders.map((o, idx) => idx === cIdx ? { ...o, workCenterCode: code, workCenterName: found ? found.name : code } : o)
                                        } : p));
                                      }}
                                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-blue-500 hover:border-slate-300"
                                    >
                                      {standardWorkCenters.map(wc => (
                                        <option key={wc.code} value={wc.code}>{wc.name}</option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* Equipment */}
                                  <td className="py-2 px-2.5">
                                    <select
                                      value={child.equipmentCode}
                                      onChange={(e) => {
                                        const code = e.target.value;
                                        const found = standardEquipments.find(eq => eq.code === code);
                                        setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                          ...p,
                                          orders: p.orders.map((o, idx) => idx === cIdx ? { ...o, equipmentCode: code, equipmentName: found ? found.name : code } : o)
                                        } : p));
                                      }}
                                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-blue-500 hover:border-slate-300"
                                    >
                                      {standardEquipments.map(eq => (
                                        <option key={eq.code} value={eq.code}>{eq.name}</option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* Position */}
                                  <td className="py-2 px-2.5">
                                    <select
                                      value={child.position}
                                      onChange={(e) => {
                                        const pos = e.target.value;
                                        setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                          ...p,
                                          orders: p.orders.map((o, idx) => idx === cIdx ? { ...o, position: pos } : o)
                                        } : p));
                                      }}
                                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-blue-500 hover:border-slate-300"
                                    >
                                      {standardPositions.map(pos => (
                                        <option key={pos} value={pos}>{pos}</option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* Employee */}
                                  <td className="py-2 px-2.5">
                                    <select
                                      value={child.employee}
                                      onChange={(e) => {
                                        const emp = e.target.value;
                                        setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                          ...p,
                                          orders: p.orders.map((o, idx) => idx === cIdx ? { ...o, employee: emp } : o)
                                        } : p));
                                      }}
                                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-blue-500 hover:border-slate-300"
                                    >
                                      {standardEmployees.map(emp => (
                                        <option key={emp.name} value={emp.name}>{emp.name}</option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* Schedule Quantity */}
                                  <td className="py-2 px-2.5">
                                    <input
                                      type="number"
                                      min={1}
                                      value={child.quantity}
                                      onChange={(e) => {
                                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                        setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                          ...p,
                                          orders: p.orders.map((o, idx) => idx === cIdx ? { ...o, quantity: val } : o)
                                        } : p));
                                      }}
                                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs font-mono font-bold text-center focus:border-blue-500 outline-none hover:border-slate-300"
                                    />
                                  </td>

                                  {/* Start Time */}
                                  <td className="py-2 px-2.5">
                                    <input
                                      type="datetime-local"
                                      value={child.plannedStartTime}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                          ...p,
                                          orders: p.orders.map((o, idx) => idx === cIdx ? { ...o, plannedStartTime: val } : o)
                                        } : p));
                                      }}
                                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white focus:border-blue-500 outline-none hover:border-slate-300"
                                    />
                                  </td>

                                  {/* End Time */}
                                  <td className="py-2 px-2.5">
                                    <input
                                      type="datetime-local"
                                      value={child.estimatedEndTime}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                          ...p,
                                          orders: p.orders.map((o, idx) => idx === cIdx ? { ...o, estimatedEndTime: val } : o)
                                        } : p));
                                      }}
                                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white focus:border-blue-500 outline-none hover:border-slate-300"
                                    />
                                  </td>

                                  {/* Remark */}
                                  <td className="py-2 px-2.5">
                                    <input
                                      type="text"
                                      value={child.remark || ''}
                                      placeholder="备注..."
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setProcesses(prev => prev.map((p, i) => i === pIdx ? {
                                          ...p,
                                          orders: p.orders.map((o, idx) => idx === cIdx ? { ...o, remark: val } : o)
                                        } : p));
                                      }}
                                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white focus:border-blue-500 outline-none hover:border-slate-300"
                                    />
                                  </td>

                                  {/* Actions - Task Split */}
                                  <td className="py-2 px-2.5 text-center sticky right-0 bg-white z-10 border-l border-slate-200">
                                    <button
                                      onClick={() => handleOpenSplit(proc.processName, child)}
                                      disabled={!child.isSelected || child.quantity <= 1}
                                      className={cn(
                                        "px-2 py-1 text-xs font-medium rounded flex items-center justify-center gap-1 transition-colors mx-auto cursor-pointer border shadow-2xs",
                                        !child.isSelected || child.quantity <= 1
                                          ? "text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed"
                                          : "text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 active:bg-purple-200"
                                      )}
                                      title="将任务拆分为多批次或多设备并行排产"
                                    >
                                      <Scissors className="w-3.5 h-3.5" />
                                      <span>拆分</span>
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
                })}
              </div>
            ) : (
              /* VIEW MODE 2: WORK ORDER CENTRIC VIEW (工单视图) */
              <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60 custom-scrollbar space-y-4">
                {ordersForPlanView.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-700 mb-1">未找到匹配的工单</h3>
                    <p className="text-xs text-slate-500">请尝试清除搜索关键词或调整优先级筛选条件</p>
                  </div>
                ) : (
                  ordersForPlanView.map((item, oIdx) => {
                    const isExpanded = orderExpandedMap[item.order.no] !== false;
                    const order = item.order;

                    // Compute mixed states for quick batch toolbar on work order header
                    const firstOp = item.processes[0]?.child;
                    const isWcMixed = item.processes.some(p => p.child.workCenterCode !== firstOp?.workCenterCode);
                    const currentWcCode = isWcMixed ? '__MIXED__' : (firstOp?.workCenterCode || 'WS-01');

                    const isEqMixed = item.processes.some(p => p.child.equipmentCode !== firstOp?.equipmentCode);
                    const currentEqCode = isEqMixed ? '__MIXED__' : (firstOp?.equipmentCode || 'EQ-01');

                    const isPosMixed = item.processes.some(p => p.child.position !== firstOp?.position);
                    const currentPos = isPosMixed ? '__MIXED__' : (firstOp?.position || '操作工');

                    const isEmpMixed = item.processes.some(p => p.child.employee !== firstOp?.employee);
                    const currentEmp = isEmpMixed ? '__MIXED__' : (firstOp?.employee || '张师傅');

                    const isRepMixed = item.processes.some(p => p.child.reportingType !== firstOp?.reportingType);
                    const currentRepType = isRepMixed ? '__MIXED__' : (firstOp?.reportingType || 'PIECE');

                    return (
                      <div
                        key={order.no}
                        className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200 hover:border-slate-300"
                      >
                        {/* Work Order Card Header */}
                        <div
                          className={cn(
                            "px-5 py-3 border-b flex flex-wrap items-center justify-between gap-4 transition-colors",
                            isExpanded ? "bg-slate-50/90 border-slate-200" : "bg-white border-transparent hover:bg-slate-50/50"
                          )}
                        >
                          {/* Left Order Info */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => setOrderExpandedMap(prev => ({ ...prev, [order.no]: !isExpanded }))}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>

                            {/* Order Checkbox (Select all processes of this order) */}
                            <input
                              type="checkbox"
                              checked={item.allSelected}
                              ref={el => {
                                if (el) el.indeterminate = item.someSelected;
                              }}
                              onChange={(e) => toggleAllProcessesOfOrder(order.no, e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              title="全选/反选该工单下所有排产工序"
                            />

                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-xs">
                                {oIdx + 1}
                              </span>

                              <div className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <span className="text-blue-600">{order.no}</span>
                                {order.so && (
                                  <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                                    SO: {order.so}{order.lineItem ? `-${order.lineItem}` : ''}
                                  </span>
                                )}
                              </div>

                              {/* Priority Badge */}
                              <span className={cn(
                                "text-[11px] px-2 py-0.5 rounded-full font-bold border",
                                order.priority === '紧急' && "bg-red-50 text-red-700 border-red-200",
                                order.priority === '高' && "bg-orange-50 text-orange-700 border-orange-200",
                                order.priority === '中' && "bg-blue-50 text-blue-700 border-blue-200",
                                (order.priority === '低' || !order.priority) && "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                {order.priority || '中'}
                              </span>

                              {/* Product Info */}
                              <span className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                                {order.product}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ({order.productCode})
                              </span>

                              {/* Planned Qty */}
                              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                                计划数: {order.qty} 台
                              </span>

                              {/* Process Progress Badge */}
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-mono border",
                                item.selectedCount === item.totalCount
                                  ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                已选 {item.selectedCount}/{item.totalCount} 道工序
                              </span>
                            </div>
                          </div>

                          {/* Right Work Order Quick Batch Tooling (工单统一配置控制栏) */}
                          <div className="inline-flex items-center flex-wrap bg-white rounded-lg border border-slate-200 shadow-2xs divide-x divide-slate-200 overflow-hidden">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 px-2.5 py-1.5 bg-white select-none">
                              <Settings2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>工单统一配置:</span>
                            </div>

                            {/* Work Center */}
                            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                              <span className="text-slate-500 text-[11px] whitespace-nowrap">工作站</span>
                              <select
                                value={currentWcCode}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  if (code === '__MIXED__') return;
                                  const found = standardWorkCenters.find(w => w.code === code);
                                  batchUpdateOrderProcesses(order.no, {
                                    workCenterCode: code,
                                    workCenterName: found ? found.name : code
                                  });
                                }}
                                className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[95px] cursor-pointer hover:bg-slate-50 border-0"
                              >
                                {isWcMixed && <option value="__MIXED__">多选不同值</option>}
                                {standardWorkCenters.map(wc => (
                                  <option key={wc.code} value={wc.code}>{wc.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Equipment */}
                            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                              <span className="text-slate-500 text-[11px] whitespace-nowrap">设备</span>
                              <select
                                value={currentEqCode}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  if (code === '__MIXED__') return;
                                  const found = standardEquipments.find(eq => eq.code === code);
                                  batchUpdateOrderProcesses(order.no, {
                                    equipmentCode: code,
                                    equipmentName: found ? found.name : code
                                  });
                                }}
                                className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[90px] cursor-pointer hover:bg-slate-50 border-0"
                              >
                                {isEqMixed && <option value="__MIXED__">多选不同值</option>}
                                {standardEquipments.map(eq => (
                                  <option key={eq.code} value={eq.code}>{eq.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Position */}
                            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                              <span className="text-slate-500 text-[11px] whitespace-nowrap">岗位</span>
                              <select
                                value={currentPos}
                                onChange={(e) => {
                                  const pos = e.target.value;
                                  if (pos === '__MIXED__') return;
                                  batchUpdateOrderProcesses(order.no, { position: pos });
                                }}
                                className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[80px] cursor-pointer hover:bg-slate-50 border-0"
                              >
                                {isPosMixed && <option value="__MIXED__">多选不同值</option>}
                                {standardPositions.map(pos => (
                                  <option key={pos} value={pos}>{pos}</option>
                                ))}
                              </select>
                            </div>

                            {/* Employee */}
                            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                              <span className="text-slate-500 text-[11px] whitespace-nowrap">员工</span>
                              <select
                                value={currentEmp}
                                onChange={(e) => {
                                  const emp = e.target.value;
                                  if (emp === '__MIXED__') return;
                                  batchUpdateOrderProcesses(order.no, { employee: emp });
                                }}
                                className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[75px] cursor-pointer hover:bg-slate-50 border-0"
                              >
                                {isEmpMixed && <option value="__MIXED__">多选不同值</option>}
                                {standardEmployees.map(emp => (
                                  <option key={emp.name} value={emp.name}>{emp.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Reporting Type */}
                            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white">
                              <span className="text-slate-500 text-[11px] whitespace-nowrap">报工</span>
                              <select
                                value={currentRepType}
                                onChange={(e) => {
                                  const val = e.target.value as ReportingType;
                                  if (val === '__MIXED__' as any) return;
                                  batchUpdateOrderProcesses(order.no, { reportingType: val });
                                }}
                                className="px-1 py-0.5 rounded text-xs text-slate-700 bg-white outline-none focus:text-blue-600 min-w-[85px] cursor-pointer hover:bg-slate-50 border-0"
                              >
                                {isRepMixed && <option value="__MIXED__">多选不同值</option>}
                                <option value="PIECE">计件报工</option>
                                <option value="TIME">工时报工</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Work Order Processes Table */}
                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                              <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="py-2 px-2.5 w-9 text-center">
                                    <input
                                      type="checkbox"
                                      checked={item.allSelected}
                                      onChange={(e) => toggleAllProcessesOfOrder(order.no, e.target.checked)}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </th>
                                  <th className="py-2 px-2.5 min-w-[150px]">工序号 / 工序名称</th>

                                  {/* Configured Read-only Columns for Order */}
                                  {availableOrderFields.filter(f => visibleFieldKeys.has(f.key) && f.key !== 'product' && f.key !== 'productCode').map(f => (
                                    <th key={f.key} className="py-2 px-2.5 bg-slate-100/50 text-slate-700 font-bold whitespace-nowrap">
                                      {f.label}
                                    </th>
                                  ))}

                                  {/* Scheduling Controls */}
                                  <th className="py-2 px-2.5 min-w-[110px]">工作站</th>
                                  <th className="py-2 px-2.5 min-w-[105px]">设备</th>
                                  <th className="py-2 px-2.5 min-w-[85px]">岗位</th>
                                  <th className="py-2 px-2.5 min-w-[85px]">指派员工</th>
                                  <th className="py-2 px-2.5 min-w-[80px] text-center bg-emerald-50/60 text-emerald-900">排产数量</th>
                                  <th className="py-2 px-2.5 min-w-[130px] text-center bg-indigo-50/60 text-indigo-900">计划开工时间</th>
                                  <th className="py-2 px-2.5 min-w-[130px] text-center bg-indigo-50/60 text-indigo-900">预计完工时间</th>
                                  <th className="py-2 px-2.5 min-w-[90px]">报工类型</th>
                                  <th className="py-2 px-2.5 min-w-[100px]">备注</th>
                                  <th className="py-2 px-2.5 w-20 text-center sticky right-0 bg-slate-50 z-10 border-l border-slate-200">操作</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {item.processes.map((op, opIdx) => {
                                  const child = op.child;
                                  return (
                                    <tr
                                      key={`${order.no}-${op.processName}-${opIdx}-${child.splitId || ''}`}
                                      className={cn(
                                        "transition-colors",
                                        !child.isSelected ? "bg-slate-50/60 opacity-60" : "hover:bg-blue-50/30"
                                      )}
                                    >
                                      <td className="py-2 px-2.5 text-center">
                                        <input
                                          type="checkbox"
                                          checked={child.isSelected}
                                          onChange={() => toggleOrderSelection(op.processName, order.no, child.splitId)}
                                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                      </td>

                                      {/* Step Index & Process Name */}
                                      <td className="py-2 px-2.5">
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-bold text-[11px] border border-slate-200">
                                            {op.procIdx}
                                          </span>
                                          <span className="font-bold text-slate-800 text-xs">
                                            {op.processName}
                                          </span>
                                          {child.isSplit && (
                                            <span className="bg-purple-100 text-purple-700 text-[10px] px-1 py-0.2 rounded font-medium">
                                              拆分项
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Read-only Configured Columns */}
                                      {availableOrderFields.filter(f => visibleFieldKeys.has(f.key) && f.key !== 'product' && f.key !== 'productCode').map(f => {
                                        const val = getOrderFieldValue(order, f.key);
                                        return (
                                          <td key={f.key} className="py-2 px-2.5 whitespace-nowrap bg-slate-50/30">
                                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100/90 text-slate-700 font-medium text-xs border border-slate-200/80">
                                              {val}
                                            </span>
                                          </td>
                                        );
                                      })}

                                      {/* Work Center */}
                                      <td className="py-2 px-2.5">
                                        <select
                                          value={child.workCenterCode}
                                          onChange={(e) => {
                                            const code = e.target.value;
                                            const found = standardWorkCenters.find(w => w.code === code);
                                            updateOrderProcessParam(op.processName, order.no, child.splitId, {
                                              workCenterCode: code,
                                              workCenterName: found ? found.name : code
                                            });
                                          }}
                                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-blue-500 hover:border-slate-300"
                                        >
                                          {standardWorkCenters.map(wc => (
                                            <option key={wc.code} value={wc.code}>{wc.name}</option>
                                          ))}
                                        </select>
                                      </td>

                                      {/* Equipment */}
                                      <td className="py-2 px-2.5">
                                        <select
                                          value={child.equipmentCode}
                                          onChange={(e) => {
                                            const code = e.target.value;
                                            const found = standardEquipments.find(eq => eq.code === code);
                                            updateOrderProcessParam(op.processName, order.no, child.splitId, {
                                              equipmentCode: code,
                                              equipmentName: found ? found.name : code
                                            });
                                          }}
                                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-blue-500 hover:border-slate-300"
                                        >
                                          {standardEquipments.map(eq => (
                                            <option key={eq.code} value={eq.code}>{eq.name}</option>
                                          ))}
                                        </select>
                                      </td>

                                      {/* Position */}
                                      <td className="py-2 px-2.5">
                                        <select
                                          value={child.position}
                                          onChange={(e) => {
                                            const pos = e.target.value;
                                            updateOrderProcessParam(op.processName, order.no, child.splitId, { position: pos });
                                          }}
                                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-blue-500 hover:border-slate-300"
                                        >
                                          {standardPositions.map(pos => (
                                            <option key={pos} value={pos}>{pos}</option>
                                          ))}
                                        </select>
                                      </td>

                                      {/* Employee */}
                                      <td className="py-2 px-2.5">
                                        <select
                                          value={child.employee}
                                          onChange={(e) => {
                                            const emp = e.target.value;
                                            updateOrderProcessParam(op.processName, order.no, child.splitId, { employee: emp });
                                          }}
                                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white outline-none focus:border-blue-500 hover:border-slate-300"
                                        >
                                          {standardEmployees.map(emp => (
                                            <option key={emp.name} value={emp.name}>{emp.name}</option>
                                          ))}
                                        </select>
                                      </td>

                                      {/* Quantity */}
                                      <td className="py-2 px-2.5">
                                        <input
                                          type="number"
                                          min={1}
                                          value={child.quantity}
                                          onChange={(e) => {
                                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                            updateOrderProcessParam(op.processName, order.no, child.splitId, { quantity: val });
                                          }}
                                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs font-mono font-bold text-center focus:border-blue-500 outline-none hover:border-slate-300"
                                        />
                                      </td>

                                      {/* Planned Start Time */}
                                      <td className="py-2 px-2.5">
                                        <input
                                          type="datetime-local"
                                          value={child.plannedStartTime}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            updateOrderProcessParam(op.processName, order.no, child.splitId, { plannedStartTime: val });
                                          }}
                                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white focus:border-blue-500 outline-none hover:border-slate-300"
                                        />
                                      </td>

                                      {/* Planned End Time */}
                                      <td className="py-2 px-2.5">
                                        <input
                                          type="datetime-local"
                                          value={child.estimatedEndTime}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            updateOrderProcessParam(op.processName, order.no, child.splitId, { estimatedEndTime: val });
                                          }}
                                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white focus:border-blue-500 outline-none hover:border-slate-300"
                                        />
                                      </td>

                                      {/* Reporting Type */}
                                      <td className="py-2 px-2.5">
                                        <select
                                          value={child.reportingType}
                                          onChange={(e) => {
                                            const val = e.target.value as ReportingType;
                                            updateOrderProcessParam(op.processName, order.no, child.splitId, { reportingType: val });
                                          }}
                                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white focus:border-blue-500 outline-none hover:border-slate-300"
                                        >
                                          <option value="PIECE">计件</option>
                                          <option value="TIME">工时</option>
                                        </select>
                                      </td>

                                      {/* Remark */}
                                      <td className="py-2 px-2.5">
                                        <input
                                          type="text"
                                          value={child.remark || ''}
                                          placeholder="工序备注..."
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            updateOrderProcessParam(op.processName, order.no, child.splitId, { remark: val });
                                          }}
                                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs bg-white focus:border-blue-500 outline-none hover:border-slate-300"
                                        />
                                      </td>

                                      {/* Actions */}
                                      <td className="py-2 px-2.5 text-center sticky right-0 bg-white z-10 border-l border-slate-200">
                                        <button
                                          onClick={() => handleOpenSplit(op.processName, child)}
                                          disabled={!child.isSelected || child.quantity <= 1}
                                          className={cn(
                                            "px-2 py-1 text-xs font-medium rounded flex items-center justify-center gap-1 transition-colors mx-auto cursor-pointer border shadow-2xs",
                                            !child.isSelected || child.quantity <= 1
                                              ? "text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed"
                                              : "text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 active:bg-purple-200"
                                          )}
                                          title="将任务拆分为多批次或多设备并行排产"
                                        >
                                          <Scissors className="w-3.5 h-3.5" />
                                          <span>拆分</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Bottom Sticky Action Footer */}
            <footer className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-lg z-30">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  共配置 <strong className="text-blue-600 font-bold">{processes.length}</strong> 道工序，涉及 <strong className="text-slate-800 font-bold">{validOrders.length}</strong> 个工单；
                  点击右侧按钮生成计划并自动同步到「<strong className="text-blue-600 font-bold">生产任务</strong>」页签。
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  取消并退出
                </button>

                {/* Primary Button renamed to "生成排产计划" */}
                <button 
                  onClick={handleGenerateSchedulePlan}
                  className="px-6 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>生成排产计划</span>
                </button>
              </div>
            </footer>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 【生产任务】 (Production Tasks Tab - Work Order Centric View)     */}
        {/* ========================================================================= */}
        {activeMainTab === 'TASKS' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
            
            {/* Left Sidebar: Work Order List / Navigation Tree */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>工单维度导航</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    共 {selectedOrders.length} 个工单
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed mb-2.5">
                  勾选工单可批量下发该工单的全部待下发任务
                </div>

                {/* Work Order Multi-selection & Batch Dispatch Work Order Action */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length > 0 && selectedWorkOrderNos.size === selectedOrders.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedWorkOrderNos(new Set(selectedOrders.map(o => o.no)));
                          } else {
                            setSelectedWorkOrderNos(new Set());
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>全选工单 ({selectedWorkOrderNos.size}/{selectedOrders.length})</span>
                    </label>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-medium border border-amber-200/60 font-mono">
                      待下发 {selectedOrdersUnissuedTasksCount}
                    </span>
                  </div>

                  <button
                    onClick={handleBatchDispatchByWorkOrders}
                    disabled={selectedWorkOrderNos.size === 0 || selectedOrdersUnissuedTasksCount === 0}
                    className={cn(
                      "w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer",
                      selectedWorkOrderNos.size === 0 || selectedOrdersUnissuedTasksCount === 0
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-600"
                    )}
                    title="将所勾选工单的所有待下发任务一键批量下发"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>批量下发工单任务 {selectedOrdersUnissuedTasksCount > 0 && `(${selectedOrdersUnissuedTasksCount})`}</span>
                  </button>
                </div>
              </div>

              {/* Work Order Cards List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                
                {/* Option: All Work Orders */}
                <div
                  onClick={() => setSelectedWorkOrderNo('ALL')}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer",
                    selectedWorkOrderNo === 'ALL'
                      ? "bg-blue-50/80 border-blue-300 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      全部工单任务汇总
                    </span>
                    <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-100/70 px-1.5 py-0.2 rounded">
                      {sessionTasks.length} 项
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>待下发: <strong className="text-amber-600 font-mono">{totalUnissuedCount}</strong></span>
                    <span>·</span>
                    <span>已下发: <strong className="text-emerald-600 font-mono">{totalDispatchedCount}</strong></span>
                  </div>
                </div>

                {/* Individual Work Order Items */}
                {selectedOrders.map(order => {
                  const stats = orderTaskStats.get(order.no) || { total: 0, unissued: 0, dispatched: 0 };
                  const isSelectedView = selectedWorkOrderNo === order.no;
                  const isChecked = selectedWorkOrderNos.has(order.no);

                  return (
                    <div
                      key={order.no}
                      onClick={() => setSelectedWorkOrderNo(order.no)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer relative",
                        isSelectedView
                          ? "bg-blue-50/80 border-blue-400 shadow-xs ring-1 ring-blue-300"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedWorkOrderNos(prev => {
                                const next = new Set(prev);
                                if (next.has(order.no)) next.delete(order.no);
                                else next.add(order.no);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-mono font-bold text-xs text-blue-600">{order.no}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.2 rounded",
                          order.priority === '紧急' ? "bg-red-100 text-red-700" :
                          order.priority === '高' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {order.priority || '中'}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900 truncate mb-1.5 pl-5" title={order.product}>
                        {order.product}
                      </div>

                      {/* Configured Order Fields Tags */}
                      <div className="flex flex-wrap gap-1 mb-2 pl-5">
                        {visibleFieldKeys.has('so') && order.so && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono truncate max-w-[120px]" title={order.so}>
                            SO: {order.so}
                          </span>
                        )}
                        {visibleFieldKeys.has('lineItem') && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                            项: {order.lineItem || '01'}
                          </span>
                        )}
                        {visibleFieldKeys.has('customer') && order.customer && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded truncate max-w-[100px]" title={order.customer}>
                            {order.customer}
                          </span>
                        )}
                        {visibleFieldKeys.has('qty') && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.2 rounded font-mono">
                            {order.qty} 台
                          </span>
                        )}
                      </div>

                      {/* Task Counts Summary */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] pl-5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-600 font-mono text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-medium">待下发 {stats.unissued}</span>
                          <span className="text-emerald-700 font-mono text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-medium">已下发 {stats.dispatched}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Main Panel: Tasks List & Operations */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
              
              {/* Header: Selected Work Order Banner */}
              <div className="p-4 bg-white border-b border-slate-200 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        {selectedWorkOrderNo === 'ALL' ? '全部工单生产任务汇总' : `工单：${selectedWorkOrderNo}`}
                      </h2>
                      {selectedWorkOrderNo !== 'ALL' && (
                        <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {selectedOrders.find(o => o.no === selectedWorkOrderNo)?.product}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub-Tabs: 待下发任务 vs 已下发任务 */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => { setTaskSubTab('UNISSUED'); setSelectedTaskIds(new Set()); }}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        taskSubTab === 'UNISSUED'
                          ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <span>待下发任务</span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                        {totalUnissuedCount}
                      </span>
                    </button>
                    <button
                      onClick={() => { setTaskSubTab('DISPATCHED'); setSelectedTaskIds(new Set()); }}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        taskSubTab === 'DISPATCHED'
                          ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <span>已下发任务</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                        {totalDispatchedCount}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Task Table Toolbar: 搜索框在左，批量下发任务在右 (交换位置) */}
              <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Left Side: Search Box + Priority Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Search Box */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={taskSearchKeyword}
                      onChange={(e) => setTaskSearchKeyword(e.target.value)}
                      placeholder="搜索任务编号 / 工序 / 员工..."
                      className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-blue-500 outline-none w-64 shadow-2xs"
                    />
                    {taskSearchKeyword && (
                      <button 
                        onClick={() => setTaskSearchKeyword('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Priority Filter */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>优先级:</span>
                    <select
                      value={taskPriorityFilter}
                      onChange={(e) => setTaskPriorityFilter(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded bg-white text-xs outline-none focus:border-blue-500"
                    >
                      <option value="ALL">全部</option>
                      <option value="紧急">紧急</option>
                      <option value="高">高</option>
                      <option value="中">中</option>
                      <option value="低">低</option>
                    </select>
                  </div>
                </div>

                {/* Right Side: Batch Dispatch Button */}
                <div>
                  {taskSubTab === 'UNISSUED' && (
                    <button
                      onClick={handleBatchDispatchTasks}
                      disabled={selectedTaskIds.size === 0}
                      className={cn(
                        "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer",
                        selectedTaskIds.size === 0
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
                          : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600"
                      )}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>批量下发任务 {selectedTaskIds.size > 0 && `(${selectedTaskIds.size})`}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tasks Table */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {filteredTasks.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-700 mb-1">
                      {taskSubTab === 'UNISSUED' ? '暂无待下发任务' : '暂无已下发任务'}
                    </div>
                    <div className="text-xs text-slate-400 max-w-sm mx-auto">
                      {taskSubTab === 'UNISSUED'
                        ? '请先在「排产计划」页签配置工序并点击「生成排产计划」'
                        : '可在「待下发任务」列表中勾选任务并执行「下发任务」操作'}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            {taskSubTab === 'UNISSUED' && (
                              <th className="py-2.5 px-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.has(t.id))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
                                    } else {
                                      setSelectedTaskIds(new Set());
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </th>
                            )}
                            <th className="py-2.5 px-3 min-w-[140px]">任务编号</th>
                            <th className="py-2.5 px-3 min-w-[150px]">工单号 / 产品</th>
                            
                            {/* Dynamically configured fields in task table */}
                            {visibleFieldKeys.has('so') && <th className="py-2.5 px-3 min-w-[120px]">销售订单</th>}
                            {visibleFieldKeys.has('lineItem') && <th className="py-2.5 px-3 min-w-[60px]">项次</th>}
                            {visibleFieldKeys.has('customer') && <th className="py-2.5 px-3 min-w-[110px]">客户名称</th>}

                            <th className="py-2.5 px-3 min-w-[90px]">工序名称</th>
                            <th className="py-2.5 px-3 min-w-[140px]">工作站 / 设备</th>
                            <th className="py-2.5 px-3 min-w-[100px]">指派员工</th>
                            <th className="py-2.5 px-3 min-w-[80px] text-center">排产数量</th>
                            <th className="py-2.5 px-3 min-w-[140px]">计划时间</th>
                            <th className="py-2.5 px-3 min-w-[80px] text-center">状态</th>
                            <th className="py-2.5 px-3 min-w-[120px] text-center sticky right-0 bg-slate-50 z-20 border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)]">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredTasks.map((task) => {
                            const isSelected = selectedTaskIds.has(task.id);

                            return (
                              <tr
                                key={task.id}
                                className={cn(
                                  "transition-colors",
                                  isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/70"
                                )}
                              >
                                {taskSubTab === 'UNISSUED' && (
                                  <td className="py-2.5 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setSelectedTaskIds(prev => {
                                          const next = new Set(prev);
                                          if (next.has(task.id)) next.delete(task.id);
                                          else next.add(task.id);
                                          return next;
                                        });
                                      }}
                                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                )}

                                {/* Task Code */}
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-600 text-xs">
                                  {task.taskCode}
                                </td>

                                {/* Order No & Product */}
                                <td className="py-2.5 px-3">
                                  <div className="font-mono text-xs font-semibold text-slate-800">{task.orderNo}</div>
                                  <div className="text-[11px] text-slate-500 truncate max-w-[160px]" title={task.orderProduct}>
                                    {task.orderProduct}
                                  </div>
                                </td>

                                {/* Dynamic Configured Fields */}
                                {visibleFieldKeys.has('so') && (
                                  <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                                    {task.orderSo || '-'}
                                  </td>
                                )}
                                {visibleFieldKeys.has('lineItem') && (
                                  <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                                    {task.orderLineItem || '01'}
                                  </td>
                                )}
                                {visibleFieldKeys.has('customer') && (
                                  <td className="py-2.5 px-3 text-xs text-slate-700 truncate max-w-[110px]" title={task.orderCustomer}>
                                    {task.orderCustomer || '-'}
                                  </td>
                                )}

                                {/* Process Name */}
                                <td className="py-2.5 px-3 font-medium text-slate-900">
                                  <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                    {task.processName}
                                  </span>
                                </td>

                                {/* Work Center & Equipment */}
                                <td className="py-2.5 px-3 text-xs text-slate-700">
                                  <div className="font-medium text-slate-800">{task.workCenterName}</div>
                                  <div className="text-[11px] text-slate-400">{task.equipmentName}</div>
                                </td>

                                {/* Position & Employee */}
                                <td className="py-2.5 px-3 text-xs text-slate-700">
                                  <div className="font-medium">{task.employee}</div>
                                  <div className="text-[11px] text-slate-400">{task.position}</div>
                                </td>

                                {/* Quantity */}
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                                  {task.requiredQuantity} 台
                                </td>

                                {/* Planned Time */}
                                <td className="py-2.5 px-3 text-xs text-slate-500 font-mono">
                                  <div>{task.plannedStartTime.replace('T', ' ')}</div>
                                  <div className="text-slate-400">~ {task.estimatedEndTime.replace('T', ' ')}</div>
                                </td>

                                {/* Status */}
                                <td className="py-2.5 px-3 text-center">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-bold border",
                                    task.status === '待下发' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    task.status === '待生产' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    task.status === '生产中' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                    task.status === '取消' ? "bg-slate-100 text-slate-500 border-slate-200" :
                                    "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  )}>
                                    {task.status}
                                  </span>
                                </td>

                                {/* Action Direct Buttons (No hidden popup clipping issues) */}
                                <td className="py-2.5 px-3 text-center sticky right-0 bg-white z-20 border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)]">
                                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                    {taskSubTab === 'UNISSUED' ? (
                                      <>
                                        <button
                                          onClick={() => handleDispatchSingleTask(task)}
                                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 border border-blue-200/60"
                                          title="单独下发此生产任务"
                                        >
                                          <Send className="w-3 h-3" />
                                          <span>下发</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTaskClick(task.id)}
                                          className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 border border-red-200/60"
                                          title="删除此生产任务"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          <span>删除</span>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleCancelDispatchedTask(task)}
                                          className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 border border-amber-200/60"
                                          title="取消此任务并退回计划池"
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                          <span>取消</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTaskClick(task.id)}
                                          className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 border border-red-200/60"
                                          title="删除此任务"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          <span>删除</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Sticky Action Footer for Production Tasks */}
          <footer className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-lg z-30">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                {selectedWorkOrderNo === 'ALL' ? (
                  <>
                    全部工单生产任务视图，当前待下发任务 <strong className="text-amber-600 font-mono font-bold">{currentViewUnissuedTasks.length}</strong> 个，已下发 <strong className="text-emerald-700 font-mono font-bold">{totalDispatchedCount}</strong> 个；点击右侧按钮下发任务。
                  </>
                ) : (
                  <>
                    当前工单 <strong className="text-blue-600 font-mono font-bold">{selectedWorkOrderNo}</strong>，待下发任务 <strong className="text-amber-600 font-mono font-bold">{currentViewUnissuedTasks.length}</strong> 个；点击右侧按钮下发任务。
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="px-5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                取消
              </button>

              <button 
                onClick={handleDispatchAllCurrentViewTasks}
                disabled={currentViewUnissuedTasks.length === 0}
                className={cn(
                  "px-6 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2 cursor-pointer active:scale-98",
                  currentViewUnissuedTasks.length === 0
                    ? "bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600"
                )}
                title="将当前页面的全部待下发生产任务一键下发"
              >
                <Send className="w-4 h-4" />
                <span>下发任务 {currentViewUnissuedTasks.length > 0 && `(${currentViewUnissuedTasks.length})`}</span>
              </button>
            </div>
          </footer>

        </div>
      )}

      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS: TASK SPLIT, FIELD CONFIG & DELETE SECONDARY NOTICE            */}
      {/* ========================================================================= */}

      {/* Modal A: Field Configuration Modal (支持修改整个页面的工单数据字段配置) */}
      {isFieldConfigOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">工单展示字段配置</h3>
                  <p className="text-[11px] text-slate-500">勾选控制排产计划与生产任务中只读展示的工单扩展字段（如销售订单、项次等）</p>
                </div>
              </div>
              <button
                onClick={() => setIsFieldConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5 custom-scrollbar">
              <div className="flex items-center justify-between bg-blue-50/60 p-3 rounded-lg border border-blue-100 text-xs text-blue-900">
                <span>💡 勾选后的字段将在排产计划工单明细行及生产任务列表中只读展示，帮助您更全面地掌握工单业务背景。</span>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    onClick={handleSelectAllFields}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    全选
                  </button>
                  <span>·</span>
                  <button
                    onClick={handleResetDefaultFields}
                    className="text-xs text-slate-600 hover:underline cursor-pointer"
                  >
                    恢复默认
                  </button>
                </div>
              </div>

              {/* Grouped Field Items */}
              {(['业务信息', '产品属性', '计划日期', '组织车间'] as const).map(group => {
                const groupFields = availableOrderFields.filter(f => f.category === group);
                if (groupFields.length === 0) return null;

                return (
                  <div key={group} className="space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-500" />
                      <span>{group}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {groupFields.map(field => {
                        const isChecked = visibleFieldKeys.has(field.key);

                        return (
                          <div
                            key={field.key}
                            onClick={() => toggleFieldVisibility(field.key)}
                            className={cn(
                              "p-2.5 rounded-lg border flex items-start gap-2.5 transition-colors cursor-pointer select-none",
                              isChecked
                                ? "bg-blue-50/60 border-blue-300 text-blue-900"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Handled by container
                              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                                <span>{field.label}</span>
                                {field.defaultVisible && (
                                  <span className="text-[10px] text-blue-600 bg-blue-100/60 px-1.5 py-0.2 rounded font-normal">
                                    推荐
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5" title={field.description}>
                                {field.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                已选中 <strong className="text-blue-600">{visibleFieldKeys.size}</strong> 个展示字段
              </span>
              <button
                onClick={() => setIsFieldConfigOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                完成配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal B: Task Split Modal */}
      {splitTarget && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">排产任务拆分</h3>
                  <p className="text-xs text-slate-500">
                    工单 <strong className="font-mono text-blue-600">{splitTarget.child.order.no}</strong> - 工序 <strong className="text-slate-800">{splitTarget.processName}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setSplitTarget(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>支持将该工单拆分为多个批次或分配到不同设备/工作站并行排产。所有拆分项数量之和须等于原需求数量。</span>
              </div>
              <div className="bg-white px-3 py-1 rounded border border-blue-200 font-bold text-blue-800 text-xs">
                需求总数量: <span className="font-mono text-sm">{splitTarget.child.quantity}</span> 台
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-3">
              {splitRows.map((row, idx) => (
                <div key={row.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-mono font-bold text-slate-400 w-6 text-center">#{idx + 1}</span>
                  
                  {/* Work center */}
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[10px] text-slate-400 block mb-0.5">工作站</label>
                    <select
                      value={row.workCenterCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const found = standardWorkCenters.find(w => w.code === code);
                        const newRows = [...splitRows];
                        newRows[idx].workCenterCode = code;
                        newRows[idx].workCenterName = found ? found.name : code;
                        setSplitRows(newRows);
                      }}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                    >
                      {standardWorkCenters.map(wc => (
                        <option key={wc.code} value={wc.code}>{wc.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Equipment */}
                  <div className="flex-1 min-w-[130px]">
                    <label className="text-[10px] text-slate-400 block mb-0.5">设备</label>
                    <select
                      value={row.equipmentCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const found = standardEquipments.find(eq => eq.code === code);
                        const newRows = [...splitRows];
                        newRows[idx].equipmentCode = code;
                        newRows[idx].equipmentName = found ? found.name : code;
                        setSplitRows(newRows);
                      }}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                    >
                      {standardEquipments.map(eq => (
                        <option key={eq.code} value={eq.code}>{eq.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="w-24">
                    <label className="text-[10px] text-emerald-700 font-bold block mb-0.5">拆分数量 (台)</label>
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        const newRows = [...splitRows];
                        newRows[idx].quantity = val;
                        setSplitRows(newRows);
                      }}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono font-bold text-center bg-white"
                    />
                  </div>

                  {/* Employee */}
                  <div className="w-28">
                    <label className="text-[10px] text-slate-400 block mb-0.5">指派员工</label>
                    <select
                      value={row.employee}
                      onChange={(e) => {
                        const newRows = [...splitRows];
                        newRows[idx].employee = e.target.value;
                        setSplitRows(newRows);
                      }}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                    >
                      {standardEmployees.map(emp => (
                        <option key={emp.name} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (splitRows.length <= 1) return;
                      setSplitRows(splitRows.filter((_, i) => i !== idx));
                    }}
                    disabled={splitRows.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded mt-3 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => setSplitRows([
                  ...splitRows,
                  {
                    id: Date.now().toString(),
                    equipmentCode: splitTarget.child.equipmentCode,
                    equipmentName: splitTarget.child.equipmentName,
                    workCenterCode: splitTarget.child.workCenterCode,
                    workCenterName: splitTarget.child.workCenterName,
                    position: splitTarget.child.position,
                    employee: splitTarget.child.employee,
                    quantity: 1,
                    plannedStartTime: splitTarget.child.plannedStartTime,
                    estimatedEndTime: splitTarget.child.estimatedEndTime,
                    remark: ''
                  }
                ])}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                新增拆分项
              </button>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {(() => {
                const splitSum = splitRows.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
                const targetSum = splitTarget.child.quantity;
                const isMatch = splitSum === targetSum;

                return (
                  <div className="text-xs font-medium">
                    {isMatch ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        ✓ 拆分匹配：已分配 {splitSum} / {targetSum} 台
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        ⚠ 差额提醒：已分配 {splitSum} 台 (目标 {targetSum} 台，差额 {targetSum - splitSum} 台)
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSplitTarget(null)}
                  className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmSplit}
                  className="px-5 py-1.5 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 shadow-sm cursor-pointer"
                >
                  确认拆分
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal C: Delete Notice Modal (Secondary Confirmation) */}
      {showDeleteNoticeModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => { setShowDeleteNoticeModal(false); setPendingDeleteTaskId(null); }}>
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
                  setPendingDeleteTaskId(null);
                }}
                className="px-4 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDeleteTask}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notificationToast && (
        <div className="fixed top-5 right-5 z-[100000] bg-white border border-slate-200 shadow-xl rounded-lg p-3.5 flex items-start gap-3 min-w-[280px] animate-in fade-in slide-in-from-top-2">
          <div className={cn(
            "p-1 rounded-full text-white shrink-0 mt-0.5",
            notificationToast.type === 'success' ? "bg-emerald-500" : notificationToast.type === 'warning' ? "bg-amber-500" : "bg-blue-500"
          )}>
            <Check className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{notificationToast.title}</div>
            <div className="text-[11px] text-slate-600 mt-0.5">{notificationToast.message}</div>
          </div>
        </div>
      )}

    </div>
  );
}
