import React, { useState } from 'react';
import { 
  ArrowLeft, CheckCircle2, ChevronRight, Play, Settings, Box, Calendar, 
  User, FileText, Printer, Download, Clock, Wrench, AlertCircle, 
  CheckCircle, Layers, ShieldCheck, Activity, Plus, FileSpreadsheet,
  Tag, Compass, Cpu, History, Truck, Building2
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { GeneratedTask } from '../types';

interface TaskDetailsProps {
  taskCode: string;
  taskData?: Partial<GeneratedTask>;
  orderNo?: string;
  onBack: () => void;
}

export default function TaskDetails({ taskCode, taskData, orderNo, onBack }: TaskDetailsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'reporting' | 'sop' | 'logs'>('info');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Mock reporting records
  const [reports, setReports] = useState([
    {
      id: 'REP-001',
      reportTime: '2026-08-25 10:30',
      reporter: taskData?.employee || '李师傅',
      position: taskData?.position || '数控技师',
      goodQty: Math.max(1, Math.floor((taskData?.requiredQuantity || 5) * 0.4)),
      scrapQty: 0,
      hours: 2.5,
      type: taskData?.reportingType === 'TIME' ? '进度工时报工' : '计件报工',
      status: '已审核',
      remark: '首件检验合格，正常批量加工'
    }
  ]);

  const [newReportForm, setNewReportForm] = useState({
    goodQty: 1,
    scrapQty: 0,
    hours: 1.0,
    remark: ''
  });

  const totalGoodQty = reports.reduce((acc, r) => acc + r.goodQty, 0);
  const totalScrapQty = reports.reduce((acc, r) => acc + r.scrapQty, 0);
  const totalRequired = taskData?.requiredQuantity || 5;
  const progressPercent = Math.min(100, Math.round((totalGoodQty / totalRequired) * 100));

  const handleAddReport = () => {
    if (newReportForm.goodQty <= 0 && newReportForm.scrapQty <= 0) return;
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setReports(prev => [
      ...prev,
      {
        id: `REP-${String(prev.length + 1).padStart(3, '0')}`,
        reportTime: timeStr,
        reporter: taskData?.employee || '李师傅',
        position: taskData?.position || '数控技师',
        goodQty: Number(newReportForm.goodQty) || 0,
        scrapQty: Number(newReportForm.scrapQty) || 0,
        hours: Number(newReportForm.hours) || 1.0,
        type: taskData?.reportingType === 'TIME' ? '进度工时报工' : '计件报工',
        status: '待审核',
        remark: newReportForm.remark || '车间现场扫码报工'
      }
    ]);

    setIsReportModalOpen(false);
    setNewReportForm({ goodQty: 1, scrapQty: 0, hours: 1.0, remark: '' });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] w-full relative overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="返回上一级页面"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">任务编码:</span>
              <h1 className="text-xl font-bold text-slate-800 font-mono tracking-tight">{taskCode}</h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                progressPercent === 100 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : progressPercent > 0 
                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                {progressPercent === 100 ? '已完成' : progressPercent > 0 ? '生产中' : '已下发待生产'}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                优先级: {taskData?.priority || '中'}
              </span>
              {taskData?.taskType === 'OUTSOURCE' && (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-purple-600" />
                  委外外协加工
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-[13px] text-slate-500 flex-wrap">
              <span className="flex items-center gap-1 font-medium text-slate-800">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                工序: {taskData?.opName || 'CNC精密加工'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-slate-400" />
                物料: {taskData?.materialName || '移载送板机'} ({taskData?.materialCode || '12-00008'})
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-slate-700">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                工作站: {taskData?.workCenterName || 'CNC精密加工中心1号机'} ({taskData?.workCenterCode || 'WS-CNC-01'})
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                指派员工: {taskData?.employee || '李师傅'} ({taskData?.position || '数控技师'})
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            打印派工单
          </button>
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs font-medium transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            车间快速报工
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white px-6 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-8 text-[14px]">
          {[
            { id: 'info', label: '任务概览与参数' },
            { id: 'reporting', label: `报工记录明细 (${reports.length})` },
            { id: 'sop', label: '工艺标准与作业指导' },
            { id: 'logs', label: '任务流转日志' }
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

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50 custom-scrollbar">
        {activeTab === 'info' && (
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Progress Tracker Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm">任务生产进度看板</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  完成率: <span className="font-bold text-blue-600 text-sm">{progressPercent}%</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500">计划排产数量</div>
                  <div className="text-lg font-bold font-mono text-slate-800 mt-1">{totalRequired} <span className="text-xs font-normal text-slate-500">台/件</span></div>
                </div>
                <div className="bg-blue-50/50 p-3.5 rounded-lg border border-blue-100">
                  <div className="text-xs text-blue-700">累计合格报工</div>
                  <div className="text-lg font-bold font-mono text-blue-700 mt-1">{totalGoodQty} <span className="text-xs font-normal text-blue-500">台/件</span></div>
                </div>
                <div className="bg-rose-50/50 p-3.5 rounded-lg border border-rose-100">
                  <div className="text-xs text-rose-700">累计不良报废</div>
                  <div className="text-lg font-bold font-mono text-rose-700 mt-1">{totalScrapQty} <span className="text-xs font-normal text-rose-500">台/件</span></div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500">剩余待完工</div>
                  <div className="text-lg font-bold font-mono text-slate-800 mt-1">{Math.max(0, totalRequired - totalGoodQty)} <span className="text-xs font-normal text-slate-500">台/件</span></div>
                </div>
              </div>
            </div>

            {/* Task Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Card: 任务与物料基础属性 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-800 text-sm">
                  <Tag className="w-4 h-4 text-blue-600" />
                  任务与物料基础信息
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">任务编码</span>
                    <span className="font-mono font-bold text-slate-800">{taskCode}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">所属生产工单</span>
                    <span className="font-mono text-blue-600 font-medium">{orderNo || 'MO202608210015'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">加工物料名称</span>
                    <span className="font-medium text-slate-800">{taskData?.materialName || '移载送板机'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">加工物料编码</span>
                    <span className="font-mono text-slate-700">{taskData?.materialCode || '12-00008'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">当前工序名称</span>
                    <span className="font-bold text-slate-800">{taskData?.opName || 'CNC精密加工'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">执行方式</span>
                    <span className="font-medium text-slate-700">{taskData?.executionType === 'OUTSOURCE' ? '委外加工' : '厂内自制'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">报工计费方式</span>
                    <span className="font-medium text-slate-700">{taskData?.reportingType === 'TIME' ? '进度工时报工' : '计件报工'}</span>
                  </div>
                </div>
              </div>

              {/* Right Card: 派工安排与时间排期 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-800 text-sm">
                  <Clock className="w-4 h-4 text-blue-600" />
                  派工安排与时间排期
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">执行工作站</span>
                    <span className="font-medium text-slate-800">{taskData?.workCenterName || 'CNC精密加工中心1号机'} ({taskData?.workCenterCode || 'WS-CNC-01'})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">负责主操员工</span>
                    <span className="font-medium text-slate-800">{taskData?.employee || '李师傅'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">岗位资质</span>
                    <span className="text-slate-700">{taskData?.position || '数控技师'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">计划开始时间</span>
                    <span className="font-mono text-slate-700">{taskData?.plannedStartTime?.replace('T', ' ') || '2026-08-25 08:30'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">预计完成时间</span>
                    <span className="font-mono text-slate-700">{taskData?.estimatedEndTime?.replace('T', ' ') || '2026-08-27 17:30'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">实际开工时间</span>
                    <span className="font-mono text-slate-700">{taskData?.actualStartTime || '2026-08-25 08:45'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">任务备注 / 附注</span>
                    <span className="text-slate-700">{taskData?.remark || '按标准公差要求加工，关键尺寸全检'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Outsource Coordination Card (when task is OUTSOURCE) */}
            {taskData?.taskType === 'OUTSOURCE' && (
              <div className="bg-purple-50/40 border border-purple-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-200/80">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-purple-900">委外外协加工协同信息</h3>
                      <p className="text-[11px] text-purple-600">外部协作厂商信息与交期履约协同跟踪</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-purple-100 text-purple-800 text-xs font-semibold">
                    外协发料 / 入库支撑已启用
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white p-3.5 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-400 block mb-1">外协承揽厂商</span>
                    <span className="font-bold text-slate-800 text-[13px] flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                      {taskData.outsourceSupplier || '外部承揽协作厂'}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-400 block mb-1">协议交付截止日</span>
                    <span className="font-mono font-bold text-purple-700 text-[13px] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      {taskData.outsourceDeliveryDate || '2026-06-25'}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-400 block mb-1">外协核算单价</span>
                    <span className="font-mono font-bold text-slate-800 text-[13px]">
                      {taskData.outsourceUnitPrice !== undefined ? `¥${taskData.outsourceUnitPrice} / 件` : '待定 / 协议核算'}
                    </span>
                  </div>
                </div>

                {taskData.outsourceReason && (
                  <div className="mt-3 bg-white p-3 rounded-lg border border-purple-100 text-xs flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">外协流转原因:</span>
                    <span className="text-slate-700 font-medium">{taskData.outsourceReason}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {activeTab === 'reporting' && (
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                本生产任务共关联 <span className="font-bold text-slate-800 font-mono">{reports.length}</span> 条报工记录
              </div>
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium cursor-pointer shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                新增报工记录
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 text-center">报工单号</th>
                    <th className="p-3.5">报工时间</th>
                    <th className="p-3.5">报工人员</th>
                    <th className="p-3.5">报工岗位</th>
                    <th className="p-3.5 text-center">合格数量</th>
                    <th className="p-3.5 text-center">报废数量</th>
                    <th className="p-3.5 text-center">报工工时(h)</th>
                    <th className="p-3.5">报工类型</th>
                    <th className="p-3.5 text-center">审核状态</th>
                    <th className="p-3.5">现场备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-center font-mono font-medium text-blue-600">{r.id}</td>
                      <td className="p-3.5 font-mono text-slate-600">{r.reportTime}</td>
                      <td className="p-3.5 font-medium text-slate-800">{r.reporter}</td>
                      <td className="p-3.5 text-slate-600">{r.position}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-600">+{r.goodQty}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-rose-600">{r.scrapQty}</td>
                      <td className="p-3.5 text-center font-mono text-slate-700">{r.hours}</td>
                      <td className="p-3.5 text-slate-600">{r.type}</td>
                      <td className="p-3.5 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium",
                          r.status === '已审核' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        )}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">{r.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sop' && (
          <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  标准作业指导书 (SOP) - {taskData?.opName || 'CNC精密加工'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">版本: SOP-2026-V2.1 | 归档部门: 生产制造技术部</p>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium border border-blue-100">
                已受控
              </span>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                <div className="font-bold text-slate-800">一、作业前准备与安全规程</div>
                <p>1. 穿戴好劳保用品（安全帽、防护眼镜、防砸工鞋），严禁佩戴手套操作旋转刀具机床。</p>
                <p>2. 检查数控加工中心润滑油、切削液位是否正常，气压是否达到 0.6MPa 标准压力。</p>
                <p>3. 确认加工程序单版本与图纸一致，核对毛坯物料编码为 <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">{taskData?.materialCode || '12-00008'}</code>。</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                <div className="font-bold text-slate-800">二、关键加工尺寸与公差控制要求</div>
                <p>1. 导轨安装基准面平面度要求 ≤ 0.02mm，表面粗糙度 Ra 1.6μm。</p>
                <p>2. 销轴孔定位公差控制在 H7 级精度，采用三坐标测量仪或塞规 100% 全检。</p>
                <p>3. 加工完成后及时清除毛刺，吹扫干净铁屑并涂抹防锈油。</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              任务全生命周期流转记录
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                <div className="text-xs font-bold text-slate-800">车间生产报工推进</div>
                <div className="text-[11px] text-slate-500 mt-0.5">2026-08-25 10:30 · 操作人: {taskData?.employee || '李师傅'}</div>
                <div className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                  完成合格品报工 {Math.max(1, Math.floor(totalRequired * 0.4))} 件，工时 2.5 小时。
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                <div className="text-xs font-bold text-slate-800">生产任务正式下发</div>
                <div className="text-[11px] text-slate-500 mt-0.5">2026-08-25 08:30 · 操作人: 生产调度主管</div>
                <div className="text-xs text-slate-600 mt-1">
                  生成生产任务编码 <span className="font-mono font-medium text-blue-600">{taskCode}</span> 并下派至 {taskData?.workCenterName || 'CNC加工中心'}。
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-slate-400 border-2 border-white shadow-xs" />
                <div className="text-xs font-bold text-slate-800">主排产规划确认</div>
                <div className="text-[11px] text-slate-500 mt-0.5">2026-08-24 16:20 · 操作人: PMC计划员</div>
                <div className="text-xs text-slate-600 mt-1">
                  在工单排产规划中完成工序工作站、人员与计划时间配置。
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Quick Report */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">车间快速生产报工</h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">合格产出数量 (台/件)</label>
                <input 
                  type="number"
                  min="0"
                  value={newReportForm.goodQty}
                  onChange={(e) => setNewReportForm({ ...newReportForm, goodQty: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">不良报废数量 (件)</label>
                <input 
                  type="number"
                  min="0"
                  value={newReportForm.scrapQty}
                  onChange={(e) => setNewReportForm({ ...newReportForm, scrapQty: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">本次报工工时 (小时)</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={newReportForm.hours}
                  onChange={(e) => setNewReportForm({ ...newReportForm, hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">现场作业说明 / 备注</label>
                <textarea 
                  rows={2}
                  value={newReportForm.remark}
                  onChange={(e) => setNewReportForm({ ...newReportForm, remark: e.target.value })}
                  placeholder="填写现场加工异常或批次说明..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                取消
              </button>
              <button 
                onClick={handleAddReport}
                className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
              >
                确认提交报工
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
