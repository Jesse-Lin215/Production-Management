import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, RotateCcw, SlidersHorizontal, ChevronDown, Check, AlertCircle,
  Play, Pause, Send, CheckCircle2, XCircle, Trash2, Edit3, MoreVertical,
  Layers, Home, ClipboardList, Filter, ArrowUpDown, Clock, Eye, AlertTriangle, 
  ShieldAlert, ChevronLeft, ChevronRight, RefreshCw, LayoutGrid, X, ChevronsUpDown,
  Plus, List, FileSpreadsheet, Truck, Scissors, Building2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  getProductionTasks, 
  subscribeProductionTasks, 
  updateProductionTaskStatus,
  updateProductionTaskPriority,
  batchUpdateProductionTaskStatus,
  deleteProductionTask,
  reportProductionTaskProgress,
  transferProductionTaskToOutsource
} from '../mockStore';
import { ProductionTask, ProductionTaskStatus, TaskPriority } from '../types';
import TransferOutsourceModal from '../components/TransferOutsourceModal';

interface ProductionTasksProps {
  onTaskClick?: (taskCode: string, taskData?: any) => void;
}

const DISPATCHED_SUB_TABS: Array<{ key: 'ALL' | ProductionTaskStatus; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: '待生产', label: '待生产' },
  { key: '生产中', label: '生产中' },
  { key: '暂停', label: '暂停' },
  { key: '已完成', label: '已完成' },
  { key: '取消', label: '取消' },
  { key: '作废', label: '作废' },
];

export default function ProductionTasks({ onTaskClick }: ProductionTasksProps) {
  const [tasks, setTasks] = useState<ProductionTask[]>(getProductionTasks());
  // 直接三态页签：待下发任务 / 已下发任务 / 外协任务
  const [mainTab, setMainTab] = useState<'UNISSUED' | 'DISPATCHED' | 'OUTSOURCE'>('UNISSUED');
  // 已下发任务下的状态筛选
  const [dispatchedSubStatus, setDispatchedSubStatus] = useState<'ALL' | ProductionTaskStatus>('ALL');
  const [outsourceModalTask, setOutsourceModalTask] = useState<ProductionTask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Action Menu state for row (Three dots menu)
  const [actionMenuTaskId, setActionMenuTaskId] = useState<string | null>(null);

  // Batch action menu
  const [showBatchMenu, setShowBatchMenu] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Work reporting modal state
  const [reportingTask, setReportingTask] = useState<ProductionTask | null>(null);
  const [reportingProgress, setReportingProgress] = useState<number>(50);
  const [reportingQty, setReportingQty] = useState<number>(0);
  const [reportingRemark, setReportingRemark] = useState<string>('');

  // Toast notice
  const [toastMessage, setToastMessage] = useState<{ title: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showDeleteNoticeModal, setShowDeleteNoticeModal] = useState(false);
  const [pendingDeleteTaskInfo, setPendingDeleteTaskInfo] = useState<{ id: string; taskCode: string } | null>(null);

  const showToast = (title: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const unsubscribe = subscribeProductionTasks(() => {
      setTasks([...getProductionTasks()]);
    });
    return () => unsubscribe();
  }, []);

  // 三态任务主数量统计
  const unissuedCount = useMemo(() => {
    return tasks.filter(t => t.status === '待下发' && t.taskType !== 'OUTSOURCE').length;
  }, [tasks]);

  const dispatchedCount = useMemo(() => {
    return tasks.filter(t => t.status !== '待下发' && t.taskType !== 'OUTSOURCE').length;
  }, [tasks]);

  const outsourceCount = useMemo(() => {
    return tasks.filter(t => t.taskType === 'OUTSOURCE').length;
  }, [tasks]);

  // 已下发子状态数量
  const dispatchedSubCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: 0,
      '待生产': 0,
      '生产中': 0,
      '暂停': 0,
      '取消': 0,
      '作废': 0,
      '已完成': 0,
    };
    tasks.forEach(t => {
      if (t.status !== '待下发' && t.taskType !== 'OUTSOURCE') {
        counts.ALL += 1;
        if (counts[t.status] !== undefined) {
          counts[t.status] += 1;
        }
      }
    });
    return counts;
  }, [tasks]);

  // Outsource Transfer confirmation
  const handleConfirmOutsource = (data: {
    outsourceQty: number;
    supplier: string;
    deliveryDate: string;
    unitPrice?: number;
    reason: string;
    remark?: string;
  }) => {
    if (!outsourceModalTask) return;
    const res = transferProductionTaskToOutsource({
      taskId: outsourceModalTask.id,
      outsourceQty: data.outsourceQty,
      supplier: data.supplier,
      deliveryDate: data.deliveryDate,
      unitPrice: data.unitPrice,
      reason: data.reason,
      remark: data.remark
    });

    if (res.success) {
      if (res.isFullDirectTransfer) {
        showToast(`任务 ${outsourceModalTask.taskCode} 已全额转为委外外协任务`, 'success');
      } else {
        showToast(
          `任务 ${outsourceModalTask.taskCode} 成功拆分保留自制历史并生成外协任务（外协 ${data.outsourceQty} 件）`,
          'success'
        );
      }
    } else {
      showToast(res.message || '转外协失败', 'error');
    }
  };

  // Filter tasks based on mainTab, dispatchedSubStatus and searchQuery
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. Main Tab Filter (直接三态：待下发任务 / 已下发任务 / 外协任务)
      if (mainTab === 'UNISSUED') {
        if (t.status !== '待下发' || t.taskType === 'OUTSOURCE') return false;
      } else if (mainTab === 'DISPATCHED') {
        if (t.status === '待下发' || t.taskType === 'OUTSOURCE') return false;
        if (dispatchedSubStatus !== 'ALL' && t.status !== dispatchedSubStatus) return false;
      } else if (mainTab === 'OUTSOURCE') {
        if (t.taskType !== 'OUTSOURCE') return false;
      }

      // 2. Search Query Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (t.taskName || t.operationName || '').toLowerCase();
      const code = (t.taskCode || '').toLowerCase();
      const mo = (t.moNo || '').toLowerCase();
      const op = (t.opName || t.operationName || '').toLowerCase();
      const so = (t.salesOrder || '').toLowerCase();
      const ws = (t.workStationName || '').toLowerCase();
      const emp = (t.employee || '').toLowerCase();
      const sup = (t.outsourceSupplier || '').toLowerCase();

      return (
        name.includes(q) ||
        code.includes(q) ||
        mo.includes(q) ||
        op.includes(q) ||
        so.includes(q) ||
        ws.includes(q) ||
        emp.includes(q) ||
        sup.includes(q)
      );
    });
  }, [tasks, mainTab, dispatchedSubStatus, searchQuery]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Tab counters
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: tasks.length,
      '待下发': 0,
      '待生产': 0,
      '生产中': 0,
      '暂停': 0,
      '取消': 0,
      '作废': 0,
      '已完成': 0,
    };
    tasks.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status] += 1;
      }
    });
    return counts;
  }, [tasks]);

  // Handle select all
  const isAllSelected = useMemo(() => {
    if (paginatedTasks.length === 0) return false;
    return paginatedTasks.every(t => selectedTaskIds.has(t.id));
  }, [paginatedTasks, selectedTaskIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedTaskIds);
      paginatedTasks.forEach(t => next.delete(t.id));
      setSelectedTaskIds(next);
    } else {
      const next = new Set(selectedTaskIds);
      paginatedTasks.forEach(t => next.add(t.id));
      setSelectedTaskIds(next);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTaskIds(next);
  };

  // Status transitions & actions strict rule implementation:
  // 1. 待下发: 下发任务 -> 待生产 | 删除 -> 彻底删除
  const handleDispatchTask = (id: string, taskCode: string) => {
    updateProductionTaskStatus(id, '待生产');
    showToast(`任务「${taskCode}」下发成功，状态变更为【待生产】`);
    setActionMenuTaskId(null);
  };

  const handleDeleteTask = (id: string, taskCode: string) => {
    setPendingDeleteTaskInfo({ id, taskCode });
    setShowDeleteNoticeModal(true);
    setActionMenuTaskId(null);
  };

  // 2. 待生产: 开始处理 -> 生产中 | 取消 -> 取消 (无法继续操作)
  const handleStartProduction = (id: string, taskCode: string) => {
    updateProductionTaskStatus(id, '生产中');
    showToast(`任务「${taskCode}」开始处理，状态变更为【生产中】`);
    setActionMenuTaskId(null);
  };

  const handleCancelTask = (id: string, taskCode: string) => {
    updateProductionTaskStatus(id, '取消');
    showToast(`任务「${taskCode}」已取消，整条任务保持记录不可再操作`, 'info');
    setActionMenuTaskId(null);
  };

  // 3. 生产中: 报工 (进进度或100%完成) | 暂停 -> 暂停 | 取消 -> 取消
  const handleOpenReportingModal = (task: ProductionTask) => {
    setReportingTask(task);
    setReportingProgress(task.progress || 50);
    setReportingQty(task.completedQuantity || Math.round((task.requiredQuantity || 1) * (task.progress || 50) / 100));
    setReportingRemark('');
    setActionMenuTaskId(null);
  };

  const handleSubmitReport = () => {
    if (!reportingTask) return;
    const progressVal = Number(reportingProgress);
    reportProductionTaskProgress(reportingTask.id, progressVal, reportingQty);
    if (progressVal >= 100) {
      showToast(`任务「${reportingTask.taskCode}」进度达100%，已自动更变为【已完成】状态`);
    } else {
      showToast(`任务「${reportingTask.taskCode}」报工更新成功，当前进度 ${progressVal}%`, 'info');
    }
    setReportingTask(null);
  };

  const handlePauseTask = (id: string, taskCode: string) => {
    updateProductionTaskStatus(id, '暂停');
    showToast(`任务「${taskCode}」已暂停生产`, 'info');
    setActionMenuTaskId(null);
  };

  // 4. 暂停: 继续 -> 生产中 | 取消 -> 取消
  const handleResumeTask = (id: string, taskCode: string) => {
    updateProductionTaskStatus(id, '生产中');
    showToast(`任务「${taskCode}」已继续恢复生产，状态变更为【生产中】`);
    setActionMenuTaskId(null);
  };

  // Batch actions
  const handleBatchDispatch = () => {
    if (selectedTaskIds.size === 0) return;
    const ids = Array.from(selectedTaskIds) as string[];
    batchUpdateProductionTaskStatus(ids, '待生产');
    showToast(`已批量下发选中的 ${ids.length} 项生产任务`);
    setSelectedTaskIds(new Set());
    setShowBatchMenu(false);
  };

  const handleBatchPause = () => {
    if (selectedTaskIds.size === 0) return;
    const ids = Array.from(selectedTaskIds) as string[];
    batchUpdateProductionTaskStatus(ids, '暂停');
    showToast(`已批量暂停选中的 ${ids.length} 项生产任务`, 'info');
    setSelectedTaskIds(new Set());
    setShowBatchMenu(false);
  };

  const handleBatchCancel = () => {
    if (selectedTaskIds.size === 0) return;
    const ids = Array.from(selectedTaskIds) as string[];
    batchUpdateProductionTaskStatus(ids, '取消');
    showToast(`已批量取消选中的 ${ids.length} 项生产任务`, 'info');
    setSelectedTaskIds(new Set());
    setShowBatchMenu(false);
  };

  // Render Status Badge matching OrderManagement style
  const renderStatusBadge = (status: ProductionTaskStatus) => {
    switch (status) {
      case '待下发':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
            待下发
          </span>
        );
      case '待生产':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            待生产
          </span>
        );
      case '生产中':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            生产中
          </span>
        );
      case '暂停':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            暂停
          </span>
        );
      case '已完成':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200">
            已完成
          </span>
        );
      case '取消':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            取消
          </span>
        );
      case '作废':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            作废
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] w-full relative text-[12px]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300 text-xs">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />}
          {toastMessage.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="font-semibold">{toastMessage.title}</span>
        </div>
      )}

      {/* Work Reporting Modal */}
      {reportingTask && (
        <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-[14px]">工序报工登记</h3>
              </div>
              <button 
                onClick={() => setReportingTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-[12px]">
              <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 space-y-1">
                <div className="flex justify-between items-center text-slate-700 font-semibold">
                  <span>{reportingTask.taskName || reportingTask.opName}</span>
                  <span className="font-mono text-blue-600 text-[11px]">{reportingTask.taskCode}</span>
                </div>
                <div className="text-slate-500 text-[11px] flex justify-between">
                  <span>工单: {reportingTask.moNo}</span>
                  <span>目标数量: {reportingTask.requiredQuantity || 1}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5 font-medium text-slate-700">
                  <span>报工进度设置 ({reportingProgress}%)</span>
                  {reportingProgress >= 100 && (
                    <span className="text-emerald-600 font-bold text-[11px]">达到100%将自动完成</span>
                  )}
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={reportingProgress}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setReportingProgress(p);
                    const req = reportingTask.requiredQuantity || 1;
                    setReportingQty(Math.round((req * p) / 100));
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>0% (未开始)</span>
                  <span>50% (加工中)</span>
                  <span>100% (已完工)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">完成合格数</label>
                  <input 
                    type="number"
                    min="0"
                    max={reportingTask.requiredQuantity || 9999}
                    value={reportingQty}
                    onChange={(e) => setReportingQty(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 outline-none focus:border-blue-500 font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">目标总件数</label>
                  <input 
                    type="text"
                    disabled
                    value={reportingTask.requiredQuantity || 1}
                    className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded px-3 py-1.5 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">报工备注 (可选)</label>
                <textarea
                  rows={2}
                  value={reportingRemark}
                  onChange={(e) => setReportingRemark(e.target.value)}
                  placeholder="请输入本次工序加工产出情况或质量说明..."
                  className="w-full border border-slate-300 rounded p-2 text-[12px] outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => {
                  setReportingProgress(100);
                  setReportingQty(reportingTask.requiredQuantity || 1);
                }}
                className="text-emerald-600 hover:text-emerald-700 font-semibold text-[12px] hover:underline cursor-pointer"
              >
                直接设为 100% 完工
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReportingTask(null)}
                  className="px-3.5 py-1.5 text-slate-600 border border-slate-300 rounded hover:bg-white transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitReport}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors cursor-pointer shadow-xs"
                >
                  确认报工
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header Bar - Exact match to OrderManagement */}
      <div className="flex items-center justify-between px-2 bg-white border-b border-slate-200 shrink-0 h-[40px]">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          <button className="p-1.5 text-slate-400 hover:text-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1 mx-1">
             <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 rounded transition-colors">
                <Home className="w-3.5 h-3.5 text-blue-500" />
                首页
             </button>
             <div className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium text-blue-600 bg-blue-50/50 rounded-t border border-b-0 border-blue-100/50 relative top-[1px]">
                <ClipboardList className="w-3.5 h-3.5" />
                生产任务
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 shrink-0 px-2">
           <button 
             onClick={() => {
               const fresh = getProductionTasks();
               setTasks([...fresh]);
               showToast('数据已刷新成功', 'info');
             }} 
             title="刷新生产任务数据" 
             className="p-1.5 hover:text-slate-600 transition-colors cursor-pointer"
           >
             <RefreshCw className="w-4 h-4" />
           </button>
           <button className="p-1.5 hover:text-slate-600 transition-colors"><LayoutGrid className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col h-full overflow-hidden">
           
           <div className="shrink-0 flex flex-col">
              {/* 直接展示三态主页签：待下发任务 / 已下发任务 / 外协任务 */}
              <div className="px-5 pt-3 pb-0 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-8">
                  <button
                    onClick={() => {
                      setMainTab('UNISSUED');
                      setCurrentPage(1);
                      setSelectedTaskIds(new Set());
                    }}
                    className={cn(
                      "pb-3 text-[13px] font-medium border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
                      mainTab === 'UNISSUED'
                        ? "border-blue-600 text-blue-600 font-bold"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span>待下发任务</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-mono",
                      mainTab === 'UNISSUED' ? "bg-blue-50 text-blue-600 font-bold" : "bg-slate-100 text-slate-500"
                    )}>
                      {unissuedCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setMainTab('DISPATCHED');
                      setCurrentPage(1);
                      setSelectedTaskIds(new Set());
                    }}
                    className={cn(
                      "pb-3 text-[13px] font-medium border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
                      mainTab === 'DISPATCHED'
                        ? "border-blue-600 text-blue-600 font-bold"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span>已下发任务</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-mono",
                      mainTab === 'DISPATCHED' ? "bg-blue-50 text-blue-600 font-bold" : "bg-slate-100 text-slate-500"
                    )}>
                      {dispatchedCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setMainTab('OUTSOURCE');
                      setCurrentPage(1);
                      setSelectedTaskIds(new Set());
                    }}
                    className={cn(
                      "pb-3 text-[13px] font-medium border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
                      mainTab === 'OUTSOURCE'
                        ? "border-purple-600 text-purple-700 font-bold"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Truck className={cn("w-4 h-4", mainTab === 'OUTSOURCE' ? "text-purple-600" : "text-slate-400")} />
                    <span>外协任务</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-mono",
                      mainTab === 'OUTSOURCE' ? "bg-purple-100 text-purple-700 font-bold" : "bg-slate-100 text-slate-500"
                    )}>
                      {outsourceCount}
                    </span>
                  </button>
                </div>

                {/* Right side info / hints */}
                <div className="pb-3">
                  {mainTab === 'OUTSOURCE' && (
                    <div className="text-[11px] text-purple-800 bg-purple-50 px-2.5 py-1 rounded border border-purple-200/80 flex items-center gap-1.5 font-medium">
                      <Truck className="w-3.5 h-3.5 text-purple-600" />
                      <span>委外外协视窗：集中跟踪外部承揽厂商交付进度、质检合格数与协议交期</span>
                    </div>
                  )}
                  {mainTab === 'UNISSUED' && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>勾选任务可批量下发，或点击【转外协】中途分派外发</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-status filter bar (仅在「已下发任务」标签下展示细分状态筛选) */}
              {mainTab === 'DISPATCHED' && (
                <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                    {DISPATCHED_SUB_TABS.map((tab) => {
                      const count = dispatchedSubCounts[tab.key] || 0;
                      const isActive = dispatchedSubStatus === tab.key;
                      return (
                        <button 
                          key={tab.key}
                          onClick={() => {
                            setDispatchedSubStatus(tab.key);
                            setCurrentPage(1);
                          }}
                          className={cn(
                            "text-[12px] font-medium whitespace-nowrap transition-colors relative py-1 cursor-pointer flex items-center gap-1.5",
                            isActive ? "text-blue-600 font-bold" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <span>{tab.label}</span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                            isActive ? "bg-blue-100 text-blue-700 font-bold" : "bg-slate-200/70 text-slate-500"
                          )}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search and Secondary Action Bar */}
              <div className="px-5 py-2.5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    共 <strong className="font-bold text-slate-800">{filteredTasks.length}</strong> 条任务
                  </span>
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2 shrink-0">
                   <div className="relative">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setCurrentPage(1)}
                        placeholder="请输入任务编码、名称、工序或工单..." 
                        className="w-[280px] pl-3 pr-8 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-400 focus:outline-none placeholder:text-slate-400"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                   </div>
                   <button 
                     onClick={() => setCurrentPage(1)}
                     className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-blue-600 border border-blue-200 bg-blue-50/50 hover:bg-blue-100 rounded transition-colors font-medium cursor-pointer"
                   >
                      <Search className="w-3.5 h-3.5" />
                      搜索
                   </button>
                   <button 
                     onClick={() => {
                       setSearchQuery('');
                       setDispatchedSubStatus('ALL');
                       setCurrentPage(1);
                     }} 
                     className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 rounded transition-colors cursor-pointer"
                   >
                      <RotateCcw className="w-3.5 h-3.5" />
                      重置
                   </button>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
                 <div className="flex items-center gap-2.5">
                    {/* Batch Actions Dropdown */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowBatchMenu(!showBatchMenu)}
                        disabled={selectedTaskIds.size === 0}
                        className={cn(
                          "flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium rounded transition-colors shadow-2xs cursor-pointer border",
                          selectedTaskIds.size > 0 
                            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" 
                            : "bg-white text-slate-400 border-slate-200 cursor-not-allowed"
                        )}
                      >
                         <List className="w-4 h-4" />
                         批量操作 {selectedTaskIds.size > 0 && <span className="bg-white text-blue-700 text-[11px] font-bold px-1.5 py-0.2 rounded-full font-mono">({selectedTaskIds.size})</span>}
                         <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {showBatchMenu && selectedTaskIds.size > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 animate-in fade-in text-[12px]">
                           <button 
                              onClick={handleBatchDispatch}
                              className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2 cursor-pointer font-medium"
                           >
                              <Send className="w-3.5 h-3.5" />
                              批量下发任务
                           </button>
                           <button 
                              onClick={handleBatchPause}
                              className="w-full text-left px-4 py-2 text-amber-600 hover:bg-amber-50 transition-colors flex items-center gap-2 cursor-pointer font-medium"
                           >
                              <Pause className="w-3.5 h-3.5" />
                              批量暂停生产
                           </button>
                           <button 
                              onClick={handleBatchCancel}
                              className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer border-t border-slate-100"
                           >
                              <XCircle className="w-3.5 h-3.5" />
                              批量取消任务
                           </button>
                        </div>
                      )}
                    </div>

                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-2xs">
                       <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                       自定义字段
                    </button>
                 </div>

                 {selectedTaskIds.size > 0 && (
                   <div className="text-[12px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded flex items-center gap-2">
                     <span>已勾选 <strong className="font-bold font-mono">{selectedTaskIds.size}</strong> 项任务</span>
                     <button 
                       onClick={() => setSelectedTaskIds(new Set())}
                       className="text-blue-500 hover:text-blue-800 underline ml-1 cursor-pointer"
                     >
                       清空勾选
                     </button>
                   </div>
                 )}
              </div>
           </div>

           {/* Table */}
           <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-[12px] min-w-[1600px]">
                 <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                    <tr className="text-slate-600 font-medium whitespace-nowrap">
                       <th className="px-0 py-3 w-[40px] min-w-[40px] text-center sticky top-0 left-0 z-30 bg-slate-50">
                          <input 
                             type="checkbox" 
                             className="rounded border-slate-300 cursor-pointer"
                             checked={isAllSelected}
                             onChange={handleToggleSelectAll}
                          />
                       </th>
                       <th className="px-4 py-3 w-[60px] min-w-[60px] sticky top-0 left-[40px] z-30 bg-slate-50">序号</th>
                       <th className="px-4 py-3 w-[200px] min-w-[200px] sticky top-0 left-[100px] z-30 bg-slate-50 shadow-[inset_-1px_0_0_#e2e8f0]">
                          <div className="flex items-center gap-1">
                             任务名称与编码 <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 min-w-[150px] sticky top-0 z-20 bg-slate-50">销售订单</th>
                       <th className="px-4 py-3 w-[120px] sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center gap-1">
                             工序名称 <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 min-w-[160px] sticky top-0 z-20 bg-slate-50">生产工单编码</th>
                       <th className="px-4 py-3 w-[110px] sticky top-0 z-20 bg-slate-50">工作站编码</th>
                       <th className="px-4 py-3 min-w-[130px] sticky top-0 z-20 bg-slate-50">工作站名称</th>
                       <th className="px-4 py-3 min-w-[140px] sticky top-0 z-20 bg-slate-50">处理人</th>
                       <th className="px-4 py-3 w-[110px] sticky top-0 z-20 bg-slate-50">岗位</th>
                       <th className="px-4 py-3 min-w-[150px] sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center gap-1">
                             任务进度 <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 w-[140px] sticky top-0 z-20 bg-slate-50">计划开始时间</th>
                       <th className="px-4 py-3 w-[140px] sticky top-0 z-20 bg-slate-50">预计完成时间</th>
                        <th className="px-4 py-3 w-[90px] min-w-[90px] sticky top-0 right-[60px] z-30 bg-slate-50 border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] text-center">
                           <div className="flex items-center justify-center gap-1">
                              生产状态 <Filter className="w-3 h-3 text-slate-400" />
                           </div>
                        </th>
                        <th className="px-0 py-3 w-[60px] min-w-[60px] text-center sticky top-0 right-0 z-30 bg-slate-50 border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]">操作</th>
                     </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                     {paginatedTasks.length === 0 ? (
                       <tr>
                         <td colSpan={15} className="py-16 text-center text-slate-400">
                           <div className="flex flex-col items-center justify-center gap-2">
                             <ClipboardList className="w-10 h-10 text-slate-300 stroke-[1.2]" />
                             <p className="text-xs font-medium">暂无相匹配的生产任务</p>
                             <p className="text-xs text-slate-400">在待排产列表中进行“批量排产”或单独“生成任务”后，会自动在此新增任务</p>
                           </div>
                         </td>
                       </tr>
                     ) : (
                       paginatedTasks.map((task, idx) => {
                         const isSelected = selectedTaskIds.has(task.id);
                         const seq = (currentPage - 1) * pageSize + idx + 1;
                         const taskTitle = task.taskName || task.operationName || "生产工序任务";
                         const isMenuOpen = actionMenuTaskId === task.id;
                         const isDisabledState = task.status === "已完成" || task.status === "取消" || task.status === "作废";
                         const canOutsource = (task.status === "待下发" || task.status === "暂停") && task.taskType !== 'OUTSOURCE';
                         const isNearBottom = idx >= paginatedTasks.length - 3 && paginatedTasks.length > 3;

                         return (
                           <tr 
                             key={task.id} 
                             className={cn(
                               "hover:bg-blue-50/30 transition-colors group",
                               isSelected && "bg-blue-50/50",
                               isMenuOpen && "relative z-30"
                             )}
                           >
                              {/* Checkbox */}
                              <td className={cn(
                                "px-0 py-3 text-center sticky left-0 z-10 transition-colors",
                                isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-slate-50"
                              )}>
                                 <input 
                                   type="checkbox" 
                                   className="rounded border-slate-300 cursor-pointer" 
                                   checked={isSelected}
                                   onChange={() => handleToggleSelectRow(task.id)}
                                 />
                              </td>

                              {/* 序号 */}
                              <td className={cn(
                                "px-4 py-3 sticky left-[40px] z-10 font-mono text-slate-500 transition-colors text-[12px]",
                                isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-slate-50"
                              )}>
                                 {seq}
                              </td>

                              {/* 任务名称与编码 */}
                              <td className={cn(
                                "px-4 py-3 sticky left-[100px] z-10 shadow-[inset_-1px_0_0_#e2e8f0] transition-colors",
                                isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-slate-50"
                              )}>
                                 <div className="flex flex-col items-start gap-0.5">
                                    <button 
                                      onClick={() => onTaskClick?.(task.taskCode, task)}
                                      className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-left cursor-pointer line-clamp-1 text-[12px]"
                                    >
                                      {taskTitle}
                                    </button>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[11px] font-mono text-slate-400">
                                        {task.taskCode}
                                      </span>
                                      {task.taskType === 'OUTSOURCE' && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold">
                                          <Truck className="w-3 h-3" />
                                          外协
                                        </span>
                                      )}
                                      {task.outsourceSplittedQty && task.outsourceSplittedQty > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium" title="部分数量已分流至外协厂">
                                          <Scissors className="w-3 h-3" />
                                          已外发 {task.outsourceSplittedQty} 件
                                        </span>
                                      ) : null}
                                    </div>
                                 </div>
                              </td>

                              {/* 销售订单 */}
                              <td className="px-4 py-3 text-slate-600 font-mono text-[12px]">
                                 {task.salesOrder || "XZZQ-26C-027 第14项"}
                              </td>

                              {/* 工序名称 */}
                              <td className="px-4 py-3 font-medium text-slate-800 text-[12px]">
                                 {task.opName || task.operationName || "加工"}
                              </td>

                              {/* 生产工单编码 */}
                              <td className="px-4 py-3 font-mono text-slate-600 text-[12px]">
                                 {task.moNo || "MO202608050011"}
                              </td>

                              {/* 工作站编码 */}
                              <td className="px-4 py-3 font-mono text-slate-500 text-[12px]">
                                 {task.workStationCode || "WS0020"}
                              </td>

                              {/* 工作站名称 */}
                              <td className="px-4 py-3 text-slate-700 text-[12px]">
                                 <div>{task.workStationName || "加工工作站"}</div>
                                 {task.outsourceDeliveryDate && (
                                   <div className="text-[10px] text-purple-600 font-mono mt-0.5 flex items-center gap-1">
                                     <Clock className="w-2.5 h-2.5" />
                                     <span>交期: {task.outsourceDeliveryDate}</span>
                                   </div>
                                 )}
                              </td>

                              {/* 处理人 */}
                              <td className="px-4 py-3 text-slate-600 truncate max-w-[150px] text-[12px]" title={task.employee || "范红利,雷衍礼"}>
                                 {task.employee || "范红利,雷衍礼"}
                              </td>

                              {/* 岗位 */}
                              <td className="px-4 py-3 text-slate-600 text-[12px]">
                                 {task.position || "工序操作员"}
                              </td>

                              {/* 任务进度 */}
                              <td className="px-4 py-3">
                                 <div className="flex items-center gap-2">
                                   <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                     <div 
                                       className={cn(
                                         "h-full rounded-full transition-all duration-300",
                                         task.status === "已完成" ? "bg-teal-500" :
                                         task.status === "暂停" ? "bg-amber-500" :
                                         task.status === "取消" || task.status === "作废" ? "bg-slate-300" : "bg-blue-600"
                                       )}
                                       style={{ width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }}
                                     />
                                   </div>
                                   <span className="text-[11px] font-mono font-medium text-slate-600 min-w-[36px] text-right">
                                     {(task.progress || 0).toFixed(1)}%
                                   </span>
                                 </div>
                              </td>

                              {/* 计划开始时间 */}
                              <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                                 {task.plannedStartTime || "2026-08-26 09:00"}
                              </td>

                              {/* 预计完成时间 */}
                              <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                                 {task.estimatedEndTime || "2026-08-27 18:00"}
                              </td>

                              {/* 生产状态 (Sticky) */}
                              <td className={cn(
                                "px-4 py-3 sticky right-[60px] text-center border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors",
                                isMenuOpen ? "z-30" : "z-10",
                                isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-slate-50"
                              )}>
                                 {renderStatusBadge(task.status)}
                              </td>

                              {/* 操作 (Sticky) - 三个点交互，严格置于最顶层 */}
                              <td className={cn(
                                "px-2 py-3 sticky right-0 text-center border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors",
                                isMenuOpen ? "z-40" : "z-10",
                                isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-slate-50"
                              )}>
                                 {isDisabledState ? (
                                   <span className="text-slate-300 font-mono">-</span>
                                 ) : (
                                   <div className="flex items-center justify-center gap-1">
                                     {canOutsource && (
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setOutsourceModalTask(task);
                                         }}
                                         className="px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
                                         title="发起转外协"
                                       >
                                         <Truck className="w-3 h-3 text-purple-600" />
                                         <span>转外协</span>
                                       </button>
                                     )}

                                     <div className="relative inline-block text-left">
                                       {/* 三个点按钮 */}
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setActionMenuTaskId(isMenuOpen ? null : task.id);
                                         }}
                                         className={cn(
                                           "p-1.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center",
                                           isMenuOpen 
                                             ? "bg-blue-50 text-blue-600" 
                                             : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                         )}
                                         title="操作菜单"
                                       >
                                         <MoreVertical className="w-4 h-4" />
                                       </button>

                                       {/* 下拉弹出菜单交互 - 浮动于最顶层，靠近底部自动向上弹 */}
                                       {isMenuOpen && (
                                         <>
                                           {/* 透明挡板，用于点击外部自动收起 */}
                                           <div 
                                             className="fixed inset-0 z-40 cursor-default" 
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setActionMenuTaskId(null);
                                             }} 
                                           />

                                           <div 
                                             className={cn(
                                               "absolute right-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl py-1 w-[120px] text-[12px] flex flex-col text-left animate-in fade-in zoom-in-95",
                                               isNearBottom ? "bottom-full mb-1" : "top-full mt-1"
                                             )}
                                             onClick={(e) => e.stopPropagation()}
                                           >
                                             {/* 1. 待下发: 下发任务 / 转外协 / 删除 */}
                                             {task.status === "待下发" && (
                                               <>
                                                 {task.taskType !== 'OUTSOURCE' && (
                                                   <button
                                                     onClick={() => {
                                                       setOutsourceModalTask(task);
                                                       setActionMenuTaskId(null);
                                                     }}
                                                     className="w-full text-left px-3 py-1.5 text-purple-600 hover:bg-purple-50 cursor-pointer font-medium transition-colors flex items-center gap-1.5"
                                                   >
                                                     <Truck className="w-3.5 h-3.5" />
                                                     <span>转外协</span>
                                                   </button>
                                                 )}
                                                 <button
                                                   onClick={() => handleDispatchTask(task.id, task.taskCode)}
                                                   className="w-full text-left px-3 py-1.5 text-blue-600 hover:bg-blue-50 cursor-pointer font-medium transition-colors"
                                                 >
                                                   下发任务
                                                 </button>
                                                 <button
                                                   onClick={() => handleDeleteTask(task.id, task.taskCode)}
                                                   className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                                 >
                                                   删除
                                                 </button>
                                               </>
                                             )}

                                             {/* 2. 待生产: 开始处理 / 取消 */}
                                             {task.status === "待生产" && (
                                               <>
                                                 <button
                                                   onClick={() => handleStartProduction(task.id, task.taskCode)}
                                                   className="w-full text-left px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 cursor-pointer font-medium transition-colors"
                                                 >
                                                   开始处理
                                                 </button>
                                                 <button
                                                   onClick={() => handleCancelTask(task.id, task.taskCode)}
                                                   className="w-full text-left px-3 py-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                                                 >
                                                   取消
                                                 </button>
                                               </>
                                             )}

                                             {/* 3. 生产中: 报工 / 暂停 / 取消 */}
                                             {task.status === "生产中" && (
                                               <>
                                                 <button
                                                   onClick={() => handleOpenReportingModal(task)}
                                                   className="w-full text-left px-3 py-1.5 text-teal-600 hover:bg-teal-50 cursor-pointer font-medium transition-colors"
                                                 >
                                                   报工
                                                 </button>
                                                 <button
                                                   onClick={() => handlePauseTask(task.id, task.taskCode)}
                                                   className="w-full text-left px-3 py-1.5 text-amber-600 hover:bg-amber-50 cursor-pointer font-medium transition-colors"
                                                 >
                                                   暂停
                                                 </button>
                                                 <button
                                                   onClick={() => handleCancelTask(task.id, task.taskCode)}
                                                   className="w-full text-left px-3 py-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                                                 >
                                                   取消
                                                 </button>
                                               </>
                                             )}

                                             {/* 4. 暂停: 继续 / 转外协 / 取消 */}
                                             {task.status === "暂停" && (
                                               <>
                                                 <button
                                                   onClick={() => handleResumeTask(task.id, task.taskCode)}
                                                   className="w-full text-left px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 cursor-pointer font-medium transition-colors"
                                                 >
                                                   继续
                                                 </button>
                                                 {task.taskType !== 'OUTSOURCE' && (
                                                   <button
                                                     onClick={() => {
                                                       setOutsourceModalTask(task);
                                                       setActionMenuTaskId(null);
                                                     }}
                                                     className="w-full text-left px-3 py-1.5 text-purple-600 hover:bg-purple-50 cursor-pointer font-medium transition-colors flex items-center gap-1.5"
                                                   >
                                                     <Truck className="w-3.5 h-3.5" />
                                                     <span>转外协</span>
                                                   </button>
                                                 )}
                                                 <button
                                                   onClick={() => handleCancelTask(task.id, task.taskCode)}
                                                   className="w-full text-left px-3 py-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                                                 >
                                                   取消
                                                 </button>
                                               </>
                                             )}
                                           </div>
                                         </>
                                       )}
                                     </div>
                                   </div>
                                 )}
                              </td>
                          </tr>
                        );
                      })
                     )}
                  </tbody>
               </table>
            </div>

           {/* Pagination Footer - Exact match to OrderManagement */}
           <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-500 shrink-0">
              <div className="flex items-center gap-2">
                 <span>共 {filteredTasks.length} 条</span>
                 <select 
                   value={pageSize}
                   onChange={(e) => {
                     setPageSize(Number(e.target.value));
                     setCurrentPage(1);
                   }}
                   className="border border-slate-200 rounded px-2 py-0.5 outline-none text-slate-600 bg-white cursor-pointer"
                 >
                    <option value={10}>10条/页</option>
                    <option value={20}>20条/页</option>
                    <option value={50}>50条/页</option>
                 </select>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1">
                    <button 
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                       <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded font-bold font-mono">
                      {currentPage}
                    </span>
                    <span className="text-slate-400">/ {totalPages}</span>
                    <button 
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                       <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>

                 <div className="flex items-center gap-1 text-slate-500">
                    <span>前往</span>
                    <input 
                      type="number" 
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setCurrentPage(Math.min(totalPages, Math.max(1, val)));
                        }
                      }}
                      className="w-10 border border-slate-200 rounded text-center py-0.5 text-[12px] outline-none font-mono"
                    />
                    <span>页</span>
                 </div>
              </div>
           </div>

         </div>
      </div>

      {/* Delete Notice Modal (Secondary Confirmation) */}
      {showDeleteNoticeModal && (
        <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => { setShowDeleteNoticeModal(false); setPendingDeleteTaskInfo(null); }}>
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
                  setPendingDeleteTaskInfo(null);
                }}
                className="px-4 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (pendingDeleteTaskInfo) {
                    deleteProductionTask(pendingDeleteTaskInfo.id);
                    showToast(`生产任务「${pendingDeleteTaskInfo.taskCode}」已成功删除`, 'error');
                  }
                  setShowDeleteNoticeModal(false);
                  setPendingDeleteTaskInfo(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 转外协模态弹窗 */}
      <TransferOutsourceModal
        isOpen={!!outsourceModalTask}
        onClose={() => setOutsourceModalTask(null)}
        task={outsourceModalTask ? {
          id: outsourceModalTask.id,
          taskCode: outsourceModalTask.taskCode,
          taskName: outsourceModalTask.taskName,
          opName: outsourceModalTask.opName || outsourceModalTask.operationName,
          moNo: outsourceModalTask.moNo,
          salesOrder: outsourceModalTask.salesOrder,
          requiredQuantity: outsourceModalTask.requiredQuantity || 1,
          completedQuantity: outsourceModalTask.completedQuantity || 0,
          status: outsourceModalTask.status,
          workStationName: outsourceModalTask.workStationName,
          employee: outsourceModalTask.employee
        } : null}
        onConfirm={handleConfirmOutsource}
      />
    </div>
  );
}
