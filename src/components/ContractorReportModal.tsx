import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  X,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  OutsourcingOrderItem,
  OutsourcingProgressRecord,
  saveOutsourcingOrder
} from '../outsourcingStore';

interface ContractorReportModalProps {
  open: boolean;
  order: OutsourcingOrderItem;
  onClose: () => void;
  onUpdated: (updatedOrder: OutsourcingOrderItem) => void;
}

export function ContractorReportModal({
  open,
  order,
  onClose,
  onUpdated
}: ContractorReportModalProps) {
  // 电脑端 / 手机端 视图切换
  const [deviceView, setDeviceView] = useState<'pc' | 'mobile'>('pc');

  // 基本信息与生产明细折叠状态
  const [basicInfoExpanded, setBasicInfoExpanded] = useState(true);
  const [prodDetailExpanded, setProdDetailExpanded] = useState(true);

  // 生产明细分页状态
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(5);
  const [jumpPage, setJumpPage] = useState('1');

  // 判断是否已经锁定报工方式（已有报工记录或 securityLink.reportMethod 明确指定）
  const existingHasQty = useMemo(() => {
    if (order.securityLink?.reportMethod === '按数量报工') return 'qty';
    if (order.securityLink?.reportMethod === '按比例报工') return 'percent';
    if (order.progressRecords && order.progressRecords.length > 0) {
      const firstMethod = order.progressRecords[0].reportMethod || '';
      if (firstMethod.includes('数量')) return 'qty';
      if (firstMethod.includes('比例') || firstMethod.includes('进度')) return 'percent';
    }
    return null;
  }, [order]);

  const [reportMode, setReportMode] = useState<'qty' | 'percent'>(
    existingHasQty || 'qty'
  );
  const isModeLocked = existingHasQty !== null && (order.progressRecords?.length ?? 0) > 0;

  // 构造报工物料列表
  const reportItems = useMemo(() => {
    if (order.materials && order.materials.length > 0) {
      return order.materials.map((m, idx) => ({
        id: m.id || `item-${idx}`,
        salesOrder: m.salesOrder || m.source || order.salesOrder || '-',
        salesOrderLine: m.salesOrderLine || m.lineNo || order.salesOrderLine || '1',
        productCode: m.productCode || order.productCode || '-',
        productName: m.productName || order.productName || m.materialName || '-',
        productSpec: m.productSpec || order.specification || '-',
        materialCode: m.materialCode || order.productCode || '-',
        materialName: m.materialName || order.productName || '-',
        specification: m.specification || order.specification || '-',
        unit: m.unit || order.unit || 'PCS',
        plannedQty: Number(m.plannedQty) || 0,
        remark: m.remark || '-'
      }));
    }
    return [
      {
        id: 'default-1',
        salesOrder: order.salesOrder || '-',
        salesOrderLine: order.salesOrderLine || '1',
        productCode: order.productCode || 'CG-00007',
        productName: order.productName || '换边机',
        productSpec: order.specification || '-',
        materialCode: order.productCode || 'CG-00007',
        materialName: order.productName || '换边机',
        specification: order.specification || '-',
        unit: order.unit || 'PCS',
        plannedQty: Number(order.plannedQty) || 18,
        remark: order.remark || '-'
      }
    ];
  }, [order]);

  // 生产明细分页计算
  const totalDetailCount = reportItems.length;
  const totalDetailPages = Math.max(1, Math.ceil(totalDetailCount / detailPageSize));
  const safeDetailPage = Math.min(detailPage, totalDetailPages);
  const pagedDetailItems = useMemo(() => {
    const start = (safeDetailPage - 1) * detailPageSize;
    return reportItems.slice(start, start + detailPageSize);
  }, [reportItems, safeDetailPage, detailPageSize]);

  // 计划总数量与已完成数量
  const totalPlannedQty = useMemo(() => {
    const sum = reportItems.reduce((acc, item) => acc + item.plannedQty, 0);
    return sum > 0 ? sum : Number(order.plannedQty) || 18;
  }, [reportItems, order.plannedQty]);

  const currentProgress = Math.min(100, Math.max(0, Number(order.productionProgress) || 0));
  const completedQty = useMemo(() => {
    // 若历史记录中有按数量报工，尝试解析累计数量，否则按比例折算
    let sumFromRecords = 0;
    let hasRecordQty = false;
    (order.progressRecords || []).forEach(r => {
      const match = (r.currentReport || '').match(/(\d+(\.\d+)?)/);
      if (match && (r.reportMethod.includes('数量') || (r.currentReport || '').includes('PCS') || (r.currentReport || '').includes(order.unit || 'PCS'))) {
        sumFromRecords += Number(match[1]);
        hasRecordQty = true;
      }
    });
    if (hasRecordQty) return Math.min(totalPlannedQty, sumFromRecords);
    return Math.round((currentProgress / 100) * totalPlannedQty);
  }, [order.progressRecords, order.unit, currentProgress, totalPlannedQty]);

  const remainingQty = Math.max(0, totalPlannedQty - completedQty);
  const defaultUnit = reportItems[0]?.unit || order.unit || 'PCS';

  // 数量更新模式下的整体输入值（对全部数量进行更新，而非逐个物料维护）
  const [inputQty, setInputQty] = useState<number>(0);
  const totalInputQty = Number(inputQty) || 0;

  // 进度更新模式下的目标整体进度
  const [targetPercent, setTargetPercent] = useState<number>(currentProgress);
  const addedPercent = Math.max(0, targetPercent - currentProgress);

  // 公共表单项
  const [submitter, setSubmitter] = useState(order.contactPerson || '');
  const [contactPhone, setContactPhone] = useState(order.contactPhone || '');
  const [remark, setRemark] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!open) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const handleSubmitProgress = () => {
    if (!submitter.trim()) {
      showToast('请填写提交人姓名（必填）');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    if (reportMode === 'qty') {
      if (totalInputQty <= 0) {
        showToast('请填写大于 0 的本次生产数量');
        return;
      }
      if (totalInputQty > remainingQty) {
        showToast(`本次报工数量合计（${totalInputQty}）不能超过剩余可报数量（${remainingQty}）`);
        return;
      }

      const nextCompletedQty = Math.min(totalPlannedQty, completedQty + totalInputQty);
      const nextProgress = Math.min(100, Math.round((nextCompletedQty / totalPlannedQty) * 100));

      const newRecord: OutsourcingProgressRecord = {
        id: `PR-${Date.now()}`,
        submitTime: nowStr,
        reportMethod: '按数量报工',
        currentReport: `+${totalInputQty} ${defaultUnit}`,
        beforeSubmit: `${completedQty} / ${totalPlannedQty} ${defaultUnit} (${currentProgress}%)`,
        afterSubmit: `${nextCompletedQty} / ${totalPlannedQty} ${defaultUnit} (${nextProgress}%)`,
        submitter: contactPhone.trim() ? `${submitter.trim()} (${contactPhone.trim()})` : submitter.trim(),
        remark: remark.trim() || '承包商扫码/链接报工（数量更新）'
      };

      const updatedOrder: OutsourcingOrderItem = {
        ...order,
        productionProgress: nextProgress,
        status: nextProgress >= 100 && order.status === '进行中' ? '待入库' : order.status,
        securityLink: {
          ...order.securityLink,
          reportMethod: '按数量报工',
          lastVisit: nowStr
        },
        progressRecords: [newRecord, ...(order.progressRecords || [])]
      };

      saveOutsourcingOrder(updatedOrder);
      onUpdated(updatedOrder);

      // 重置本次数量输入
      setInputQty(0);
      setTargetPercent(nextProgress);
      setRemark('');
      showToast('生产进度已成功更新');
    } else {
      if (addedPercent <= 0) {
        showToast('请拖动滑块调整至高于当前进度的百分比');
        return;
      }

      const nextProgress = Math.min(100, targetPercent);
      const newRecord: OutsourcingProgressRecord = {
        id: `PR-${Date.now()}`,
        submitTime: nowStr,
        reportMethod: '按比例报工',
        currentReport: `+${addedPercent}%`,
        beforeSubmit: `${currentProgress}%`,
        afterSubmit: `${nextProgress}%`,
        submitter: contactPhone.trim() ? `${submitter.trim()} (${contactPhone.trim()})` : submitter.trim(),
        remark: remark.trim() || '承包商扫码/链接报工（进度更新）'
      };

      const updatedOrder: OutsourcingOrderItem = {
        ...order,
        productionProgress: nextProgress,
        status: nextProgress >= 100 && order.status === '进行中' ? '待入库' : order.status,
        securityLink: {
          ...order.securityLink,
          reportMethod: '按比例报工',
          lastVisit: nowStr
        },
        progressRecords: [newRecord, ...(order.progressRecords || [])]
      };

      saveOutsourcingOrder(updatedOrder);
      onUpdated(updatedOrder);
      setRemark('');
      showToast('生产进度已成功更新');
    }
  };

  const isMobile = deviceView === 'mobile';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef2f7] overflow-hidden animate-in fade-in duration-150">
      {/* Toast 提示 */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-[13px] font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 顶部导航栏（含右上角电脑/手机页面切换） */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[12px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
            承包商协同报工
          </span>
          <h1 className="text-[15px] font-bold text-slate-900 truncate">
            外协工单报工页面 · {order.orderNo}
          </h1>
          <span className="hidden md:inline-block text-[12px] text-slate-400 font-mono truncate">
            {order.supplierName}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* 电脑页面 / 手机页面 兼容切换按钮 */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setDeviceView('pc')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all cursor-pointer',
                deviceView === 'pc'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Monitor className="w-3.5 h-3.5" />
              电脑页面
            </button>
            <button
              type="button"
              onClick={() => setDeviceView('mobile')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all cursor-pointer',
                deviceView === 'mobile'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              手机页面
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-medium text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-500" />
            关闭页面
          </button>
        </div>
      </header>

      {/* 主体滚动区 */}
      <div className="flex-1 overflow-y-auto py-5 px-3 sm:px-6">
        <div
          className={cn(
            'mx-auto transition-all duration-200 flex flex-col',
            isMobile
              ? 'max-w-[420px] bg-[#f4f7fb] rounded-[32px] border-[7px] border-slate-800 shadow-2xl overflow-hidden min-h-[760px]'
              : 'max-w-[920px]'
          )}
        >
          {/* 手机模拟器顶部听筒装饰条 */}
          {isMobile && (
            <div className="bg-slate-800 py-2 flex items-center justify-center shrink-0">
              <div className="w-20 h-1.5 rounded-full bg-slate-600" />
            </div>
          )}

          {/* 内容区域 */}
          <div className={cn('flex-1 space-y-4', isMobile ? 'p-3.5 pb-6' : 'pb-6')}>
            {/* 1. 基本信息（支持折叠展示） */}
            <div className="bg-white rounded-xl border border-[#e3eaf3] shadow-2xs overflow-hidden">
              <div
                onClick={() => setBasicInfoExpanded(prev => !prev)}
                className="px-5 py-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/60 transition-colors border-b border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[16px] font-bold text-slate-900">基本信息</span>
                  <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-blue-50 text-blue-600 border border-blue-200">
                    {order.outsourcingType}
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <span>{basicInfoExpanded ? '收起' : '展开'}</span>
                  {basicInfoExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {basicInfoExpanded && (
                <div className="p-5">
                  <div
                    className={cn(
                      'grid gap-y-3.5 gap-x-6 text-[13px]',
                      isMobile ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'
                    )}
                  >
                    <div>
                      <div className="text-[12px] text-slate-400 mb-0.5">外协方式</div>
                      <div className="text-slate-700">{order.outsourcingMethod || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-slate-400 mb-0.5">工艺路线 / 外协工序</div>
                      <div className="text-slate-700">
                        {order.outsourcingType === '工序外协'
                          ? `${order.processRoute || '-'} / ${order.processName || '-'}`
                          : '整单外协（全工序）'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] text-slate-400 mb-0.5">计划开始 / 计划交期</div>
                      <div className="font-mono text-slate-700">
                        {order.plannedStartDate || '-'} ~ {order.plannedDeliveryDate || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] text-slate-400 mb-0.5">联系人 / 电话</div>
                      <div className="text-slate-700">
                        {order.contactPerson || '-'} ({order.contactPhone || '-'})
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] text-slate-400 mb-0.5">计划总数量</div>
                      <div className="font-semibold text-slate-800">
                        {totalPlannedQty} {defaultUnit}
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] text-slate-400 mb-0.5">备注</div>
                      <div className="text-slate-600 truncate" title={order.remark || '-'}>
                        {order.remark || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. 外协工单生产明细（支持折叠展示 + 分页） */}
            <div className="bg-white rounded-xl border border-[#e3eaf3] shadow-2xs overflow-hidden">
              <div
                onClick={() => setProdDetailExpanded(prev => !prev)}
                className="px-5 py-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/60 transition-colors border-b border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[16px] font-bold text-slate-900">生产明细</span>
                  <span className="text-[12px] text-slate-400 font-normal">
                    共 {totalDetailCount} 项
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <span>{prodDetailExpanded ? '收起' : '展开'}</span>
                  {prodDetailExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {prodDetailExpanded && (
                <div className="p-4 sm:p-5">
                  {isMobile ? (
                    /* 手机端卡片列表展示生产明细 */
                    <div className="space-y-2.5">
                      {pagedDetailItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5 text-[12px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 text-[13px]">
                              {(safeDetailPage - 1) * detailPageSize + idx + 1}. {item.productName}
                            </span>
                            <span className="font-mono font-semibold text-blue-600">
                              计划 {item.plannedQty} {item.unit}
                            </span>
                          </div>
                          <div className="text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                            <span>销售订单: {item.salesOrder} (第{item.salesOrderLine}项)</span>
                            <span>产品编码: {item.productCode}</span>
                          </div>
                          {order.outsourcingType === '工序外协' && (
                            <div className="text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                              <span>物料: {item.materialName} ({item.materialCode})</span>
                              <span>规格: {item.specification}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* 电脑端表格展示生产明细 */
                    <div className="overflow-x-auto border border-slate-200 rounded-lg custom-scrollbar">
                      <table className="w-max min-w-full text-left border-collapse text-[13px] whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                            <th className="py-2.5 px-3 font-medium text-center w-12 whitespace-nowrap">序号</th>
                            <th className="py-2.5 px-3 font-medium whitespace-nowrap">销售订单号</th>
                            <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">项次</th>
                            <th className="py-2.5 px-3 font-medium whitespace-nowrap">产品编码</th>
                            <th className="py-2.5 px-3 font-medium whitespace-nowrap">产品名称</th>
                            <th className="py-2.5 px-3 font-medium whitespace-nowrap">产品规格</th>
                            {order.outsourcingType === '工序外协' && (
                              <>
                                <th className="py-2.5 px-3 font-medium whitespace-nowrap">物料编码</th>
                                <th className="py-2.5 px-3 font-medium whitespace-nowrap">物料名称</th>
                                <th className="py-2.5 px-3 font-medium whitespace-nowrap">规格</th>
                              </>
                            )}
                            <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">单位</th>
                            <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">计划数量</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pagedDetailItems.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono whitespace-nowrap">
                                {(safeDetailPage - 1) * detailPageSize + idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{item.salesOrder}</td>
                              <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap">{item.salesOrderLine}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{item.productCode}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">{item.productName}</td>
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.productSpec}</td>
                              {order.outsourcingType === '工序外协' && (
                                <>
                                  <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{item.materialCode}</td>
                                  <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">{item.materialName}</td>
                                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.specification}</td>
                                </>
                              )}
                              <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap">{item.unit}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                                {item.plannedQty}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 生产明细分页栏 */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-600">
                    <div>共 {totalDetailCount} 条</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={detailPageSize}
                        onChange={e => {
                          setDetailPageSize(Number(e.target.value));
                          setDetailPage(1);
                          setJumpPage('1');
                        }}
                        className="h-7 px-2 rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 focus:outline-none focus:border-blue-500"
                      >
                        <option value={5}>5条/页</option>
                        <option value={10}>10条/页</option>
                        <option value={20}>20条/页</option>
                      </select>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={safeDetailPage <= 1}
                          onClick={() => {
                            const next = Math.max(1, safeDetailPage - 1);
                            setDetailPage(next);
                            setJumpPage(String(next));
                          }}
                          className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        {Array.from({ length: totalDetailPages }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setDetailPage(p);
                              setJumpPage(String(p));
                            }}
                            className={cn(
                              'w-7 h-7 rounded-md text-[12px] font-medium flex items-center justify-center transition-colors cursor-pointer',
                              p === safeDetailPage
                                ? 'bg-[#3b82f6] text-white font-semibold'
                                : 'text-slate-700 hover:bg-slate-100'
                            )}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={safeDetailPage >= totalDetailPages}
                          onClick={() => {
                            const next = Math.min(totalDetailPages, safeDetailPage + 1);
                            setDetailPage(next);
                            setJumpPage(String(next));
                          }}
                          className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <span>前往</span>
                        <input
                          type="text"
                          value={jumpPage}
                          onChange={e => setJumpPage(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const num = parseInt(jumpPage, 10);
                              if (!isNaN(num)) {
                                const clamped = Math.min(totalDetailPages, Math.max(1, num));
                                setDetailPage(clamped);
                                setJumpPage(String(clamped));
                              }
                            }
                          }}
                          onBlur={() => {
                            const num = parseInt(jumpPage, 10);
                            if (!isNaN(num)) {
                              const clamped = Math.min(totalDetailPages, Math.max(1, num));
                              setDetailPage(clamped);
                              setJumpPage(String(clamped));
                            } else {
                              setJumpPage(String(safeDetailPage));
                            }
                          }}
                          className="w-10 h-7 text-center rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-blue-500"
                        />
                        <span>页</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 当前生产进度（严格对应图2、图3样式） */}
            <div className="bg-white rounded-xl border border-[#e3eaf3] p-5 sm:p-6 shadow-2xs">
              <h2 className="text-[17px] font-bold text-slate-900 mb-4">当前生产进度</h2>

              {reportMode === 'qty' ? (
                <>
                  <div className="flex items-baseline gap-2 mb-3.5">
                    <span className="text-[30px] leading-none font-bold text-slate-900">
                      {completedQty}
                    </span>
                    <span className="text-[13px] text-slate-500">
                      整体数量 / 计划 {totalPlannedQty} {defaultUnit}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#edf1f7] rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-[#3276ea] rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((completedQty / Math.max(1, totalPlannedQty)) * 100))}%`
                      }}
                    />
                  </div>
                  <div className="text-[13px] text-slate-500">
                    剩余可报 {remainingQty} {defaultUnit}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 mb-3.5">
                    <span className="text-[30px] leading-none font-bold text-slate-900">
                      {currentProgress}%
                    </span>
                    <span className="text-[13px] text-slate-500">整体进度</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#edf1f7] rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-[#3276ea] rounded-full transition-all duration-300"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                  <div className="text-[13px] text-slate-500">
                    距离完成还差 {Math.max(0, 100 - currentProgress)}%
                  </div>
                </>
              )}
            </div>

            {/* 4. 提交生产进度（严格对应图2、图3样式） */}
            <div className="bg-white rounded-xl border border-[#e3eaf3] p-5 sm:p-6 shadow-2xs">
              <h2 className="text-[17px] font-bold text-slate-900 mb-4">提交生产进度</h2>

              {/* 方式选择框 */}
              <div className="bg-[#f4f8ff] border border-[#d8e6ff] rounded-xl p-4 mb-6">
                <div className="text-[13px] text-slate-600 mb-3">
                  {isModeLocked ? '当前报工方式已锁定' : '首次提交请选择方式'}
                </div>
                <div className={cn('grid gap-3 mb-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                  <button
                    type="button"
                    disabled={isModeLocked && reportMode !== 'qty'}
                    onClick={() => {
                      if (!isModeLocked) setReportMode('qty');
                    }}
                    className={cn(
                      'text-left p-3.5 rounded-lg border transition-all cursor-pointer',
                      reportMode === 'qty'
                        ? 'border-[#2b7fff] bg-[#edf4ff] shadow-2xs'
                        : 'border-[#e2e8f0] bg-white hover:border-slate-300',
                      isModeLocked && reportMode !== 'qty' && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'text-[14px] font-bold mb-1',
                        reportMode === 'qty' ? 'text-[#1d6ff2]' : 'text-slate-900'
                      )}
                    >
                      数量更新
                    </div>
                    <div className="text-[12px] text-slate-500">填写本次完成数量</div>
                  </button>

                  <button
                    type="button"
                    disabled={isModeLocked && reportMode !== 'percent'}
                    onClick={() => {
                      if (!isModeLocked) setReportMode('percent');
                    }}
                    className={cn(
                      'text-left p-3.5 rounded-lg border transition-all cursor-pointer',
                      reportMode === 'percent'
                        ? 'border-[#2b7fff] bg-[#edf4ff] shadow-2xs'
                        : 'border-[#e2e8f0] bg-white hover:border-slate-300',
                      isModeLocked && reportMode !== 'percent' && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'text-[14px] font-bold mb-1',
                        reportMode === 'percent' ? 'text-[#1d6ff2]' : 'text-slate-900'
                      )}
                    >
                      进度更新
                    </div>
                    <div className="text-[12px] text-slate-500">调整提交后的整体进度</div>
                  </button>
                </div>
                <div className="text-[12px] text-slate-500">
                  第一笔生产进度提交成功后将锁定方式，后续不可切换。
                </div>
              </div>

              {/* 模式对应输入区 */}
              {reportMode === 'qty' ? (
                <div className="mb-6">
                  <div className="py-2 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-slate-900 truncate">
                        本次完成总数量
                      </div>
                      <div className="text-[13px] text-slate-500 mt-0.5">
                        计划总数量 {totalPlannedQty} {defaultUnit} · 剩余可报 {remainingQty} {defaultUnit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={remainingQty}
                        value={inputQty}
                        onChange={e => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setInputQty(val);
                        }}
                        className="w-36 sm:w-44 h-9 px-3 rounded-lg border border-slate-200 text-center text-[14px] text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-[13px] text-slate-500">{defaultUnit}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-2 flex items-center justify-between">
                    <span className="text-[14px] text-slate-500">本次生产数量合计</span>
                    <span className="text-[18px] font-bold text-slate-900">
                      {totalInputQty} {defaultUnit}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[14px] text-slate-800">调整至整体进度</span>
                    <span className="text-[24px] font-bold text-[#1d6ff2]">{targetPercent}%</span>
                  </div>

                  <div className="mb-2">
                    <input
                      type="range"
                      min={currentProgress}
                      max={100}
                      step={1}
                      value={targetPercent}
                      onChange={e => setTargetPercent(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2b7fff]"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-slate-500 mb-5">
                    <span>从 {currentProgress}% 开始</span>
                    <span>100%</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[14px] text-slate-500">本次新增进度</span>
                    <span className="text-[18px] font-bold text-slate-900">{addedPercent}%</span>
                  </div>
                </div>
              )}

              {/* 提交人 & 联系电话 */}
              <div className={cn('grid gap-4 mb-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5">提交人（必填）</label>
                  <input
                    type="text"
                    placeholder="请输入姓名"
                    value={submitter}
                    onChange={e => setSubmitter(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5">联系电话</label>
                  <input
                    type="text"
                    placeholder="请输入联系电话"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-[13px] text-slate-600 mb-1.5">备注</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="填写本次完成内容或需要备注的问题"
                    value={remark}
                    onChange={e => setRemark(e.target.value.slice(0, 500))}
                    className="w-full p-3.5 pb-6 rounded-lg border border-slate-200 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-y"
                  />
                  <span className="absolute right-3 bottom-2 text-[12px] text-slate-400 select-none">
                    {remark.length} / 500
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 底部更新按钮栏 */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3.5 sm:px-6 z-10">
            <button
              type="button"
              onClick={handleSubmitProgress}
              className="w-full h-11 rounded-lg bg-[#3276ea] hover:bg-[#2563eb] active:bg-[#1d4ed8] text-white text-[14px] font-semibold shadow-xs transition-colors cursor-pointer"
            >
              更新生产进度
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
