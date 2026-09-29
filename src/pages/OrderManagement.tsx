import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, ChevronDown, Home, RefreshCw, LayoutGrid, Search, RotateCcw, 
  Plus, List, FileSpreadsheet, Settings2, MoreVertical, FileText, ChevronsUpDown, Filter, 
  HelpCircle, X, CalendarCheck, CheckCircle2, AlertTriangle, Layers, ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getOrders, updateOrders, OrderItem } from '../mockStore';
import BatchScheduleModal from '../components/BatchScheduleModal';

interface OrderManagementProps {
  onNewOrder: () => void;
  onOrderClick: (orderNo: string) => void;
}

export default function OrderManagement({ onNewOrder, onOrderClick }: OrderManagementProps) {
  const [orders, setOrders] = useState<OrderItem[]>(() => getOrders());
  const [activeTab, setActiveTab] = useState('全部');
  const [priorityFilter, setPriorityFilter] = useState('全部');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('全部');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const ALL_DEPARTMENTS = ['钣金部', '机加部', '组装部'];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; type?: 'warning' | 'info' } | null>(null);
  const [successToast, setSuccessToast] = useState<{ message: string; details?: string } | null>(null);

  // Tabs with dynamic counts based on current order statuses
  const tabs = [
    { label: '全部', count: orders.length },
    { label: '待排产', count: orders.filter(o => o.status === '待排产').length },
    { label: '进行中', count: orders.filter(o => o.status === '进行中').length },
    { label: '已排产', count: orders.filter(o => o.status === '已排产').length },
    { label: '草稿', count: 42 },
    { label: '审批中', count: 4 },
    { label: '已审批', count: 1 },
    { label: '已完成', count: 40 },
  ];

  const priorities = [
    { label: '全部', count: null },
    { label: '紧急', count: orders.filter(o => o.priority === '紧急').length },
    { label: '高', count: orders.filter(o => o.priority === '高').length },
    { label: '中', count: orders.filter(o => o.priority === '中').length },
    { label: '低', count: orders.filter(o => o.priority === '低').length },
  ];

  const scheduleStatuses = [
    { label: '全部', count: null },
    { label: '已排产', count: orders.filter(o => o.status === '已排产' || (o.processes.length > 0 && o.processes.every(p => o.scheduledProcessMap?.[p]))).length },
    { label: '未排产', count: orders.filter(o => o.status === '待排产' || !o.processes.every(p => o.scheduledProcessMap?.[p])).length },
  ];

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    if (activeTab === '待排产' && order.status !== '待排产') return false;
    if (activeTab === '进行中' && order.status !== '进行中') return false;
    if (activeTab === '已排产' && order.status !== '已排产') return false;
    if (activeTab === '草稿' && order.status !== '草稿') return false;
    if (activeTab === '审批中' && order.status !== '审批中') return false;

    if (priorityFilter !== '全部' && order.priority !== priorityFilter) return false;
    
    // Multi-select department filter
    if (selectedDepartments.length > 0) {
      if (!order.department || !selectedDepartments.includes(order.department)) {
        return false;
      }
    }

    if (scheduleStatusFilter === '已排产') {
      const isAllSched = order.status === '已排产' || (order.processes.length > 0 && order.processes.every(p => order.scheduledProcessMap?.[p]));
      if (!isAllSched) return false;
    } else if (scheduleStatusFilter === '未排产') {
      const isAllSched = order.status === '已排产' || (order.processes.length > 0 && order.processes.every(p => order.scheduledProcessMap?.[p]));
      if (isAllSched) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNo = order.no.toLowerCase().includes(term);
      const matchProd = order.product.toLowerCase().includes(term) || order.productCode.toLowerCase().includes(term);
      const matchCust = (order.customer || '').toLowerCase().includes(term);
      if (!matchNo && !matchProd && !matchCust) return false;
    }

    return true;
  });

  const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));

  // Trigger batch schedule with state validations
  const handleOpenBatchSchedule = () => {
    setIsBatchMenuOpen(false);

    if (selectedOrderIds.length === 0) {
      setAlertModal({
        title: '未选择工单',
        message: '请先在左侧表格勾选需要进行批量排产的工单。',
        type: 'info'
      });
      return;
    }

    // Check statuses of selected orders
    const fullyScheduled = selectedOrders.filter(o => 
      o.status === '已排产' || (o.processes.length > 0 && o.processes.every(p => o.scheduledProcessMap?.[p]))
    );

    // If ALL selected orders are already scheduled -> reject with clear prompt
    if (fullyScheduled.length === selectedOrders.length) {
      setAlertModal({
        title: '已排产工单不支持批量排产',
        message: `您勾选的工单 (${fullyScheduled.map(o => o.no).join(', ')}) 均已全部完成排产，不支持重复进行批量排产！如需调整工序请进入对应工单详情页单独修改。`,
        type: 'warning'
      });
      return;
    }

    // If there are valid orders (including in-progress orders with unscheduled operations) -> proceed to batch modal
    setIsScheduleModalOpen(true);
  };

  // After batch schedule confirmed
  const handleConfirmBatchSchedule = (updatedOrders: OrderItem[], scheduledCount: number, taskCount: number) => {
    const currentOrders = getOrders();
    const merged = currentOrders.map(existing => {
      const updated = updatedOrders.find(u => u.no === existing.no);
      return updated ? updated : existing;
    });

    updateOrders(merged);
    setOrders(merged);
    setIsScheduleModalOpen(false);
    setSelectedOrderIds([]);

    setSuccessToast({
      message: `批量排产成功！已成功排产 ${scheduledCount} 个工单`,
      details: `工单状态已统一流转为「进行中」，共生成 ${taskCount} 个生产任务，已同步至车间待派工池。`
    });

    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] w-full relative">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-lg shadow-xl flex items-start gap-3 border border-emerald-500 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-sm">{successToast.message}</div>
            {successToast.details && (
              <div className="text-xs text-emerald-100 mt-1 leading-relaxed">
                {successToast.details}
              </div>
            )}
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Validation Warning Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  alertModal.type === 'warning' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                )}>
                  {alertModal.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
                </div>
                <h3 className="text-base font-bold text-slate-800">{alertModal.title}</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                {alertModal.message}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setAlertModal(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header Bar */}
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
                <FileText className="w-3.5 h-3.5" />
                工单管理
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 shrink-0 px-2">
           <button 
             onClick={() => {
               const fresh = getOrders();
               setOrders([...fresh]);
             }} 
             title="刷新工单数据" 
             className="p-1.5 hover:text-slate-600 transition-colors"
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
              {/* Tabs Top */}
              <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                   {tabs.map((tab) => (
                      <button 
                        key={tab.label}
                        onClick={() => setActiveTab(tab.label)}
                        className={cn(
                          "text-[13px] font-medium whitespace-nowrap transition-colors relative py-1 cursor-pointer",
                          activeTab === tab.label ? "text-blue-600 font-bold" : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {tab.label} {tab.count !== null && <span className="text-slate-400 font-normal">({tab.count})</span>}
                        {activeTab === tab.label && (
                          <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-blue-600 rounded-t-full" />
                        )}
                      </button>
                   ))}
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2 shrink-0">
                   <div className="relative">
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="请输入生产工单编码、产品编码或名称..." 
                        className="w-[280px] pl-3 pr-8 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-400 focus:outline-none placeholder:text-slate-400"
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                   </div>
                   <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-blue-600 border border-blue-200 bg-blue-50/50 hover:bg-blue-100 rounded transition-colors font-medium">
                      <Search className="w-3.5 h-3.5" />
                      搜索
                   </button>
                   <button 
                     onClick={() => {
                       setSearchTerm('');
                       setPriorityFilter('全部');
                       setScheduleStatusFilter('全部');
                       setSelectedDepartments([]);
                       setActiveTab('全部');
                     }} 
                     className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 rounded transition-colors"
                   >
                      <RotateCcw className="w-3.5 h-3.5" />
                      重置
                   </button>
                </div>
              </div>

              {/* Secondary Filter Tags */}
              <div className="px-4 py-2 border-b border-slate-100 flex flex-col gap-1.5 bg-slate-50/30">
                 <div className="flex items-start text-[12px]">
                    <span className="text-slate-500 w-[70px] mt-1.5 shrink-0">优先级：</span>
                    <div className="flex flex-wrap items-center gap-1">
                       {priorities.map(p => (
                          <button 
                            key={p.label}
                            onClick={() => setPriorityFilter(p.label)}
                            className={cn(
                              "px-3 py-1 rounded transition-colors cursor-pointer",
                              priorityFilter === p.label ? "bg-blue-50 text-blue-600 font-bold border border-blue-200" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                            )}
                          >
                             {p.label} {p.count !== null && <span className="text-slate-400 opacity-80">({p.count})</span>}
                          </button>
                       ))}
                    </div>
                 </div>
                 <div className="flex items-start text-[12px]">
                    <span className="text-slate-500 w-[70px] mt-1.5 shrink-0">排产状态：</span>
                    <div className="flex flex-wrap items-center gap-1">
                       {scheduleStatuses.map(s => (
                          <button 
                            key={s.label}
                            onClick={() => setScheduleStatusFilter(s.label)}
                            className={cn(
                              "px-3 py-1 rounded transition-colors cursor-pointer",
                              scheduleStatusFilter === s.label ? "bg-blue-50 text-blue-600 font-bold border border-blue-200" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                            )}
                          >
                             {s.label} {s.count !== null && <span className="text-slate-400 opacity-80">({s.count})</span>}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Actions Bar */}
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
                 <div className="flex items-center gap-2.5">
                    <button 
                       onClick={onNewOrder}
                       className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                    >
                       <Plus className="w-4 h-4" />
                       新增工单
                    </button>

                    {/* Batch Operation Dropdown */}
                     <div className="relative">
                       <button 
                         onClick={() => setIsBatchMenuOpen(!isBatchMenuOpen)}
                         className={cn(
                           "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded transition-colors shadow-2xs cursor-pointer",
                           selectedOrderIds.length > 0
                             ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                             : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                         )}
                       >
                          <List className="w-4 h-4 text-slate-500" />
                          <span>批量操作</span>
                          {selectedOrderIds.length > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                              {selectedOrderIds.length}
                            </span>
                          )}
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                       </button>
                       {isBatchMenuOpen && (
                         <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 animate-in fade-in">
                            <button 
                               onClick={handleOpenBatchSchedule}
                               className="w-full text-left px-3.5 py-2 text-[13px] text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between font-medium cursor-pointer"
                            >
                               <div className="flex items-center gap-2">
                                 <Layers className="w-3.5 h-3.5 text-blue-500" />
                                 <span>批量排产</span>
                               </div>
                               {selectedOrderIds.length > 0 && (
                                 <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                                   ({selectedOrderIds.length})
                                 </span>
                               )}
                            </button>
                         </div>
                       )}
                     </div>

                     <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors shadow-2xs">
                       BOM材料更新
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-2xs">
                       <Settings2 className="w-4 h-4 text-slate-400" />
                       自定义字段
                    </button>
                 </div>

                 {selectedOrderIds.length > 0 && (
                   <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded flex items-center gap-2">
                     <span>已勾选 <strong className="font-bold font-mono">{selectedOrderIds.length}</strong> 个工单</span>
                     <button 
                       onClick={() => setSelectedOrderIds([])}
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
              <table className="w-full text-left border-collapse text-[12px] min-w-[1400px]">
                 <thead className="bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                    <tr className="text-slate-600 font-medium whitespace-nowrap">
                       <th className="px-0 py-3 w-[40px] min-w-[40px] text-center sticky top-0 left-0 z-30 bg-slate-50">
                          <input 
                             type="checkbox" 
                             className="rounded border-slate-300 cursor-pointer"
                             checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                             onChange={(e) => {
                               if (e.target.checked) {
                                 setSelectedOrderIds(filteredOrders.map(o => o.id));
                               } else {
                                 setSelectedOrderIds([]);
                               }
                             }}
                          />
                       </th>
                       <th className="px-4 py-3 w-[70px] min-w-[70px] sticky top-0 left-[40px] z-30 bg-slate-50">序号</th>
                       <th className="px-4 py-3 w-[160px] min-w-[160px] sticky top-0 left-[110px] z-30 bg-slate-50 shadow-[inset_-1px_0_0_#e2e8f0]">
                          <div className="flex items-center gap-1">
                             工单编码 <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center gap-1">
                             工单类型 <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 relative sticky top-0 z-20 bg-slate-50">
                          <div 
                            className="flex items-center gap-1.5 cursor-pointer select-none group"
                            onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                          >
                             <span>所属部门</span>
                             <div className={cn(
                               "p-0.5 rounded transition-colors flex items-center justify-center",
                               selectedDepartments.length > 0 
                                 ? "text-blue-600 bg-blue-50 font-bold border border-blue-200" 
                                 : "text-slate-400 group-hover:text-slate-600"
                             )}>
                               <Filter className="w-3.5 h-3.5" />
                             </div>
                             {selectedDepartments.length > 0 && (
                               <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none">
                                 {selectedDepartments.length}
                               </span>
                             )}
                          </div>

                          {/* 部门多选下拉菜单 */}
                          {isDeptDropdownOpen && (
                             <>
                               {/* 点击遮罩关闭 */}
                               <div 
                                 className="fixed inset-0 z-30" 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setIsDeptDropdownOpen(false);
                                 }} 
                               />
                               <div 
                                 className="absolute top-full left-0 mt-1 w-52 bg-white rounded-md shadow-xl border border-slate-200 p-2.5 z-40 text-slate-700 font-normal normal-case tracking-normal"
                                 onClick={(e) => e.stopPropagation()}
                               >
                                  <div className="text-[12px] font-semibold text-slate-600 mb-2 pb-1.5 border-b border-slate-100 flex justify-between items-center">
                                     <span className="flex items-center gap-1">
                                        <Filter className="w-3 h-3 text-blue-600" /> 所属部门筛选
                                     </span>
                                     {selectedDepartments.length > 0 && (
                                        <button 
                                          className="text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer font-normal"
                                          onClick={() => setSelectedDepartments([])}
                                        >
                                           清空 ({selectedDepartments.length})
                                        </button>
                                     )}
                                  </div>
                                  <div className="space-y-1 max-h-48 overflow-y-auto">
                                     {ALL_DEPARTMENTS.map(dept => {
                                       const isChecked = selectedDepartments.includes(dept);
                                       const deptCount = orders.filter(o => o.department === dept).length;
                                       return (
                                         <label 
                                           key={dept} 
                                           className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-[12px] select-none"
                                         >
                                            <input 
                                              type="checkbox" 
                                              checked={isChecked}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedDepartments([...selectedDepartments, dept]);
                                                } else {
                                                  setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
                                                }
                                              }}
                                              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300 cursor-pointer"
                                            />
                                            <span className={cn(isChecked ? "font-bold text-blue-700" : "text-slate-700")}>{dept}</span>
                                            <span className="ml-auto text-[11px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                              {deptCount}
                                            </span>
                                         </label>
                                       );
                                     })}
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
                                     <button 
                                       onClick={() => {
                                         if (selectedDepartments.length === ALL_DEPARTMENTS.length) {
                                           setSelectedDepartments([]);
                                         } else {
                                           setSelectedDepartments([...ALL_DEPARTMENTS]);
                                         }
                                       }}
                                       className="text-slate-600 hover:text-blue-600 cursor-pointer font-medium"
                                     >
                                       {selectedDepartments.length === ALL_DEPARTMENTS.length ? '取消全选' : '全选'}
                                     </button>
                                     <button 
                                       onClick={() => setIsDeptDropdownOpen(false)}
                                       className="px-3 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 cursor-pointer shadow-sm"
                                     >
                                       确定
                                     </button>
                                  </div>
                               </div>
                             </>
                          )}
                       </th>
                       <th className="px-4 py-3 sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center gap-1">
                             优先级 <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 sticky top-0 z-20 bg-slate-50">产品信息</th>
                       <th className="px-4 py-3 text-center sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center justify-center gap-1">
                             产品数量 <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 min-w-[150px] sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center gap-1">
                             工单总体进度 <HelpCircle className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 min-w-[280px] sticky top-0 z-20 bg-slate-50">工序排产与进度</th>
                       <th className="px-4 py-3 sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center gap-1">
                             时间进度 <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center gap-1">
                             计划开始日期 <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center gap-1">
                             计划结束日期 <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-4 py-3 sticky top-0 z-20 bg-slate-50">
                          <div className="flex items-center gap-1">
                             客户信息
                          </div>
                       </th>
                       <th className="px-4 py-3 w-[100px] min-w-[100px] sticky top-0 right-[60px] z-30 bg-slate-50 border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center gap-1">
                             单据状态 <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                       </th>
                       <th className="px-0 py-3 w-[60px] min-w-[60px] text-center sticky top-0 right-0 z-30 bg-slate-50 border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]">操作</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order, idx) => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      const allProcessesScheduled = order.processes.length > 0 && order.processes.every(p => order.scheduledProcessMap?.[p]);

                      return (
                        <tr 
                          key={order.id} 
                          className={cn(
                            "hover:bg-blue-50/30 transition-colors group",
                            isSelected && "bg-blue-50/50"
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
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds([...selectedOrderIds, order.id]);
                                  } else {
                                    setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                                  }
                                }}
                              />
                           </td>

                           {/* Index */}
                           <td className={cn(
                             "px-4 py-3 text-slate-500 sticky left-[40px] z-10 font-mono transition-colors",
                             isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-slate-50"
                           )}>
                              {idx + 1}
                           </td>

                           {/* Order No */}
                           <td 
                             className={cn(
                               "px-4 py-3 text-blue-600 font-medium cursor-pointer hover:underline sticky left-[110px] z-10 shadow-[inset_-1px_0_0_#e2e8f0] font-mono transition-colors",
                               isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-slate-50"
                             )}
                             onClick={() => onOrderClick(order.no)}
                           >
                              {order.no}
                           </td>

                           {/* Order Type */}
                           <td className="px-4 py-3 text-blue-600">{order.type}</td>

                           {/* Department */}
                           <td className="px-4 py-3 whitespace-nowrap">
                              <span className={cn(
                                "px-2.5 py-1 rounded text-[11px] font-medium border",
                                order.department === '钣金部' ? "bg-amber-50 text-amber-700 border-amber-200/80" :
                                order.department === '机加部' ? "bg-blue-50 text-blue-700 border-blue-200/80" :
                                order.department === '组装部' ? "bg-purple-50 text-purple-700 border-purple-200/80" :
                                "bg-slate-50 text-slate-600 border-slate-200"
                              )}>
                                 {order.department || '未分配'}
                              </span>
                           </td>

                           {/* Priority */}
                           <td className="px-4 py-3">
                              {order.priority && (
                                 <span className={cn(
                                   "px-2 py-0.5 rounded text-[11px] font-medium",
                                   order.priority === '紧急' ? "bg-rose-100 text-rose-700 border border-rose-200 font-bold" :
                                   order.priority === '高' ? "bg-amber-100 text-amber-700 border border-amber-200" :
                                   "bg-slate-100 text-slate-700"
                                 )}>
                                   {order.priority}
                                 </span>
                              )}
                           </td>

                           {/* Product */}
                           <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{order.product}</div>
                              <div className="text-slate-400 text-[11px] font-mono">{order.productCode}</div>
                           </td>

                           {/* Quantity */}
                           <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                             {order.qty} 台
                           </td>

                           {/* Overall Progress */}
                           <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                 <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${order.overallProgress}%` }} />
                                 </div>
                                 <span className="text-[11px] font-mono text-slate-500 w-8">{order.overallProgress}%</span>
                              </div>
                           </td>

                           {/* Processes */}
                           <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-[11px]">
                                 {order.processes.map((process, pIdx) => {
                                   const isProcScheduled = !!order.scheduledProcessMap?.[process];
                                   return (
                                     <React.Fragment key={pIdx}>
                                        <div className={cn(
                                          "flex items-center px-1.5 py-0.5 rounded border transition-colors",
                                          isProcScheduled 
                                            ? "text-emerald-700 bg-emerald-50 border-emerald-200 font-medium" 
                                            : "text-slate-600 bg-slate-50 border-slate-200"
                                        )}>
                                           <div className={cn(
                                             "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] mr-1",
                                             isProcScheduled ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                                           )}>
                                             {isProcScheduled ? '✓' : (pIdx + 1)}
                                           </div>
                                           <span>{process}</span>
                                        </div>
                                        {pIdx < order.processes.length - 1 && (
                                           <span className="text-slate-300">→</span>
                                        )}
                                     </React.Fragment>
                                   );
                                 })}
                              </div>
                           </td>

                           {/* Time Progress */}
                           <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                 <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
                                 </div>
                                 <span className="font-mono text-slate-600">45%</span>
                              </div>
                           </td>

                           <td className="px-4 py-3 font-mono text-slate-600">{order.plannedStart}</td>
                           <td className="px-4 py-3 font-mono text-slate-600">{order.plannedEnd}</td>
                           <td className="px-4 py-3 text-slate-600">{order.customer || '-'}</td>

                           {/* Status Badge */}
                           <td className={cn(
                             "px-4 py-3 sticky right-[60px] z-10 border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors",
                             isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-slate-50"
                           )}>
                              {order.status === '待排产' ? (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                  待排产
                                </span>
                              ) : order.status === '已排产' ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                  已排产
                                </span>
                              ) : (
                                <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                  进行中
                                </span>
                              )}
                           </td>

                           {/* Actions */}
                           <td className={cn(
                             "px-0 py-3 text-center sticky right-0 z-10 border-l border-slate-200/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors",
                             isSelected ? "bg-[#f0f7ff]" : "bg-white group-hover:bg-slate-50"
                           )}>
                              <button 
                                onClick={() => onOrderClick(order.no)} 
                                className="p-1 hover:bg-slate-100 rounded text-blue-600 hover:text-blue-800 transition-colors text-xs font-medium cursor-pointer"
                              >
                                 详情
                              </button>
                           </td>
                        </tr>
                      );
                    })}
                 </tbody>
              </table>
           </div>

           {/* Footer Pagination */}
           <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[12px] text-slate-500 shrink-0 mt-auto">
              <div>
                 已选中 <span className="text-blue-600 font-bold font-mono">{selectedOrderIds.length}</span> 条 &nbsp;·&nbsp;
                 当前页工单 <span className="font-bold text-slate-700">{filteredOrders.length}</span> 笔
              </div>
              <div className="flex items-center gap-4">
                 <span>共 {orders.length} 条</span>
                 <select className="border border-slate-300 rounded px-2 py-1 bg-white outline-none">
                    <option>20条/页</option>
                 </select>
                 <div className="flex items-center gap-1">
                    <button className="px-2 py-1 border border-slate-200 bg-white rounded hover:bg-slate-50">&lt;</button>
                    <button className="px-2.5 py-1 bg-blue-600 text-white rounded font-medium">1</button>
                    <button className="px-2 py-1 border border-slate-200 bg-white rounded hover:bg-slate-50">&gt;</button>
                 </div>
              </div>
           </div>

        </div>
      </div>

      {/* Batch Schedule Modal Component */}
      {isScheduleModalOpen && (
        <BatchScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          selectedOrders={selectedOrders}
          onConfirmSchedule={handleConfirmBatchSchedule}
        />
      )}
    </div>
  );
}
