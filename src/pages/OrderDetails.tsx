import React, { useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Play, Settings, Box, Calendar, User, FileText } from 'lucide-react';
import SchedulingPanel from '../components/SchedulingPanel';
import TaskPanel from '../components/TaskPanel';
import { getOrders, getOrderSchedulePlan, saveOrderSchedulePlan, getRecommendedWorkCenter, getRecommendedEmployee, OrderItem } from '../mockStore';
import { SchedulePlanItem } from '../types';

interface OrderDetailsProps {
  orderNo: string;
  onBack: () => void;
  onTaskClick?: (taskCode: string, task?: any) => void;
}

export default function OrderDetails({ orderNo, onBack, onTaskClick }: OrderDetailsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'bom' | 'schedule' | 'tasks'>('info');

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
    so: 'SO-20260601-001',
    plannedStart: '2026-08-25',
    plannedEnd: '2026-09-05',
    overallProgress: 0,
    status: '进行中' as const,
    processes: ['编程下图', 'CNC', '车床', '机加铣床', '线割加工', '攻牙'],
    scheduledProcessMap: {}
  };

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

  // Parent order product info only (no child orders / sub-assemblies)
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
          opCode: `OP-0${idx + 1}`,
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
    <div className="flex flex-col h-full bg-[#f8fafc] w-full relative overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-xs">
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
            <div className="flex items-center gap-2 mt-1 text-[13px] text-slate-500">
              <span className="flex items-center gap-1"><Box className="w-3.5 h-3.5" />产品: {orderData.product} ({orderData.productCode})</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-slate-700 font-medium">数量: {orderData.qty} 台</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-slate-500">客户: {orderData.customer || '-'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] text-slate-400 bg-slate-100 border border-slate-200 rounded shadow-xs cursor-not-allowed">
            <Settings className="w-4 h-4" />
            工单设置
          </button>
          <button className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] text-slate-400 bg-slate-100 border border-slate-200 rounded shadow-xs font-medium cursor-not-allowed">
            <Play className="w-4 h-4 fill-slate-400" />
            快速报工
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white px-6 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-8 text-[14px]">
          {[
            { id: 'info', label: '基本信息' },
            { id: 'bom', label: 'BOM组成' },
            { id: 'schedule', label: '排产计划' },
            { id: 'tasks', label: '生产任务' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 border-b-2 font-medium transition-colors cursor-pointer ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600 font-bold' 
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'info' && (
          <div className="p-8 h-full overflow-auto custom-scrollbar bg-[#f0f2f5]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-1 h-4 bg-[#1677ff] rounded-xs"></div>
                 <h2 className="text-base font-bold text-slate-800">基础信息</h2>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row gap-8 mb-6">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <div className="flex items-start gap-4">
                  <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">生产工单编码</label>
                  <div className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded flex items-center text-[13px] text-slate-700 font-mono">
                    {orderData.no}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">工单类型</label>
                  <div className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded flex items-center text-[13px] text-slate-700">
                    {orderData.type || '成品自制'}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">所属部门</label>
                  <div className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded flex items-center text-[13px] text-blue-700 font-medium">
                    {orderData.department || '机加部'}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">生产产品</label>
                  <div className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded flex items-center text-[13px] text-slate-700 font-bold">
                    {orderData.product} ({orderData.productCode})
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">生产数量</label>
                  <div className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded flex items-center text-[13px] text-slate-700 font-mono font-bold">
                    {orderData.qty} 台
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">客户名称</label>
                  <div className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded flex items-center text-[13px] text-slate-700">
                    {orderData.customer || '内部中心'}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">关联销售单</label>
                  <div className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded flex items-center text-[13px] text-slate-700 font-mono">
                    {orderData.so || 'SO-20260601-001'}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">计划开工日期</label>
                  <div className="flex-1 flex items-center gap-2 h-9 px-3 bg-slate-50 border border-slate-200 rounded text-[13px] text-slate-700 font-mono">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{orderData.plannedStart}</span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">计划交货日期</label>
                  <div className="flex-1 flex items-center gap-2 h-9 px-3 bg-slate-50 border border-slate-200 rounded text-[13px] text-slate-700 font-mono">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{orderData.plannedEnd}</span>
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-[160px] flex flex-col shrink-0 pt-1">
                <div className="flex flex-col items-center">
                  <span className="text-[13px] text-slate-600 mb-2">产品图纸</span>
                  <div className="w-40 h-40 border-[1.5px] border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <FileText className="w-8 h-8 opacity-20 mb-2" />
                    <span className="text-xs">图纸.pdf</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 mt-2">
              <div className="flex items-center gap-3">
                 <div className="w-1 h-4 bg-[#1677ff] rounded-xs"></div>
                 <h2 className="text-base font-bold text-slate-800">关键工艺路线</h2>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3 flex-wrap">
                 {orderData.processes.map((process: string, pIdx: number) => (
                    <React.Fragment key={pIdx}>
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[13px] font-medium text-slate-700">
                          <span className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-[11px] text-slate-400 shadow-xs">{pIdx + 1}</span>
                          {process}
                       </div>
                       {pIdx < orderData.processes.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                       )}
                    </React.Fragment>
                 ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bom' && (
          <div className="h-full w-full p-4">
            <div className="h-full bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col items-center justify-center text-slate-400 p-8">
              <Box className="w-10 h-10 stroke-[1.2] mb-3 text-slate-300 opacity-60" />
              <p className="text-[13px] font-medium text-slate-500">暂无BOM数据</p>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="h-full w-full p-4">
             <div className="h-full bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
                <SchedulingPanel 
                  bomData={bomData} 
                  schedulePlanMap={schedulePlanMap} 
                  onUpdateSchedulePlan={handleUpdateSchedulePlan} 
                  setSchedulePlanMap={setSchedulePlanMap} 
                  hideSidebar={true} 
                  readOnly={true} 
                />
             </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="h-full w-full p-4">
             <div className="h-full bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
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
          </div>
        )}
      </div>
    </div>
  );
}
