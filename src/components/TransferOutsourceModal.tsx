import React, { useState, useMemo } from 'react';
import { 
  X, 
  Truck, 
  Building2, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  Info, 
  Scissors, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Hash, 
  Boxes
} from 'lucide-react';
import { recommendedOutsourceSuppliers } from '../mockStore';

export interface OutsourceTaskTarget {
  id: string;
  taskCode: string;
  taskName?: string;
  opName?: string;
  moNo?: string;
  salesOrder?: string;
  requiredQuantity: number;
  completedQuantity?: number;
  status: string;
  workStationName?: string;
  employee?: string;
}

interface TransferOutsourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: OutsourceTaskTarget | null;
  onConfirm: (data: {
    outsourceQty: number;
    supplier: string;
    deliveryDate: string;
    unitPrice?: number;
    reason: string;
    remark?: string;
  }) => void;
}

const COMMON_REASONS = [
  '车间产能超负荷/工期紧急',
  '机台设备突发故障停机',
  '工序工艺受限/特殊委外协同',
  '突发加单/急件交期分流',
  '其他原因委外'
];

export default function TransferOutsourceModal({
  isOpen,
  onClose,
  task,
  onConfirm
}: TransferOutsourceModalProps) {
  if (!isOpen || !task) return null;

  const totalReq = Number(task.requiredQuantity) || 0;
  const compQty = Number(task.completedQuantity) || 0;
  // 外协上限 = 当前任务需求数 - 已生产数量
  const maxAvailableOutsource = Math.max(0, totalReq - compQty);

  // Form states
  const [outsourceQty, setOutsourceQty] = useState<number>(maxAvailableOutsource);
  const [selectedSupplier, setSelectedSupplier] = useState<string>(recommendedOutsourceSuppliers[0]?.name || '');
  const [customSupplier, setCustomSupplier] = useState<string>('');
  const [isCustomSupplier, setIsCustomSupplier] = useState<boolean>(false);
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    // Default 3 days later
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customRemark, setCustomRemark] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Strategy detection: Full direct transfer vs Split transfer
  const isFullDirectTransfer = compQty === 0 && outsourceQty === totalReq;
  const isSplitTransfer = !isFullDirectTransfer && outsourceQty > 0;
  const remainingSelfQty = totalReq - outsourceQty;

  const effectiveSupplier = isCustomSupplier ? customSupplier.trim() : selectedSupplier;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (outsourceQty <= 0) {
      setErrorMsg('转外协数量必须大于 0');
      return;
    }
    if (outsourceQty > maxAvailableOutsource) {
      setErrorMsg(`转外协数量不能超过最大上限（${maxAvailableOutsource} 件）`);
      return;
    }
    if (!effectiveSupplier) {
      setErrorMsg('请选择或输入外协加工商');
      return;
    }
    if (!deliveryDate) {
      setErrorMsg('请选择预计外协回厂交期');
      return;
    }

    onConfirm({
      outsourceQty,
      supplier: effectiveSupplier,
      deliveryDate,
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      reason: selectedReason,
      remark: customRemark.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">发起生产转外协</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  委外协作
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                将车间在制或待排产工序紧急委外至合作加工厂
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Task Summary Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">任务单号:</span>
                <span className="font-mono font-bold text-slate-800">{task.taskCode}</span>
                {task.moNo && (
                  <span className="px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-mono">
                    {task.moNo}
                  </span>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                task.status === '待下发' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
              }`}>
                当前状态: {task.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
              <div>
                <span className="text-slate-400 block">工序/任务:</span>
                <span className="font-semibold text-slate-800">{task.opName || task.taskName || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">需求总量 / 已生产:</span>
                <span className="font-medium text-slate-800">
                  <strong className="text-blue-600 font-bold">{totalReq}</strong> 件 
                  <span className="text-slate-400 mx-1">/</span> 
                  <span className={compQty > 0 ? "text-emerald-600 font-semibold" : "text-slate-500"}>{compQty} 件已产</span>
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">可转外协上限:</span>
                <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                  {maxAvailableOutsource} 件
                </span>
              </div>
            </div>
          </div>

          {/* 2. Outsource Quantity Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-purple-600" />
                <span>转外协数量</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                上限: <strong className="text-slate-800 font-mono">{maxAvailableOutsource}</strong> 件
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  max={maxAvailableOutsource}
                  value={outsourceQty || ''}
                  onChange={(e) => {
                    setErrorMsg('');
                    setOutsourceQty(Number(e.target.value));
                  }}
                  className="w-full pl-3 pr-12 py-2 border border-slate-300 rounded-lg text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  placeholder={`输入数量 (1 - ${maxAvailableOutsource})`}
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">件</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setOutsourceQty(maxAvailableOutsource);
                }}
                className="px-3 py-2 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                全额转出 ({maxAvailableOutsource})
              </button>
            </div>

            {/* Dynamic Strategy Explanation Notice */}
            {isFullDirectTransfer ? (
              <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-lg text-xs text-purple-800 flex items-start gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold block">模式：全额直接转外协</strong>
                  该任务尚未开工（已产 0 件），且您填入了全部需求数（{outsourceQty} 件）。此任务将直接变更为外协任务，由外部供应商全权加工。
                </div>
              </div>
            ) : isSplitTransfer ? (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2 animate-in fade-in duration-200">
                <Scissors className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold block">模式：自动拆单保护历史工时</strong>
                  {compQty > 0 ? (
                    <span>车间已加工 <strong>{compQty}</strong> 件。为了保护工人工时与报工账目，</span>
                  ) : (
                    <span>当前为部分转外协。</span>
                  )}
                  原自制任务将保留并调减需求为 <strong>{remainingSelfQty} 件</strong>（历史记录完全保留）；同时系统将为您新增一条 <strong>{outsourceQty} 件</strong> 的外协任务。
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. Outsource Supplier & Delivery Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>外协加工商</span>
                  <span className="text-rose-500">*</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomSupplier(!isCustomSupplier)}
                  className="text-[11px] text-purple-600 hover:text-purple-700 underline font-normal"
                >
                  {isCustomSupplier ? '从合作库选择' : '手动填写新厂商'}
                </button>
              </label>

              {isCustomSupplier ? (
                <input
                  type="text"
                  value={customSupplier}
                  onChange={(e) => setCustomSupplier(e.target.value)}
                  placeholder="输入外协供应商全称"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
              ) : (
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                >
                  {recommendedOutsourceSuppliers.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.capability})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>预计外协回厂交期</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
            </div>
          </div>

          {/* 4. Unit Price & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                <span>外协加工单价(选填)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-3 pr-12 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">元/件</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>转外协主要原因</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              >
                {COMMON_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Additional Remark */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">补充说明 / 工艺图纸交接要求</label>
            <textarea
              rows={2}
              value={customRemark}
              onChange={(e) => setCustomRemark(e.target.value)}
              placeholder="可输入随货图纸版本、特殊外观要求、外发包材等备注..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 resize-none"
            />
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            外发数量: <strong className="text-purple-700 font-mono text-sm">{outsourceQty || 0}</strong> 件
            {unitPrice && Number(unitPrice) > 0 && (
              <span className="ml-2 text-slate-400">
                (预计委外费: <strong className="text-slate-700">¥{(outsourceQty * Number(unitPrice)).toFixed(2)}</strong>)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>确认发起外协</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
