import React from 'react';
import type { SalesOrderProduct } from '../types';
import { Package, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Minus, Plus, Cpu, GitBranch, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProductInfoSectionProps {
  key?: React.Key;
  products: SalesOrderProduct[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  onUpdateProductionQuantity: (productId: string, quantity: number) => void;
  onUpdateBreakdownQuantity?: (productId: string, orderNo: string, quantity: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  salesOrderNo?: string;
  selectedSalesOrderNos?: string[];
  sourceType?: string;
}

export default function ProductInfoSection({
  products,
  selectedProductId,
  onSelectProduct,
  onUpdateProductionQuantity,
  onUpdateBreakdownQuantity,
  isExpanded,
  onToggleExpand,
  salesOrderNo,
  selectedSalesOrderNos = [],
  sourceType = '手工创建'
}: ProductInfoSectionProps) {
  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  const handleQuantityChange = (prodId: string, val: string) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1) {
      onUpdateProductionQuantity(prodId, 1);
    } else {
      onUpdateProductionQuantity(prodId, parsed);
    }
  };

  const handleStepQuantity = (e: React.MouseEvent, prodId: string, currentQty: number, delta: number) => {
    e.stopPropagation();
    const nextQty = Math.max(1, (currentQty || 1) + delta);
    onUpdateProductionQuantity(prodId, nextQty);
  };

  const isMultiOrder = selectedSalesOrderNos.length > 1;

  return (
    <div id="product-info-section" className="w-full border border-slate-200 rounded-xl overflow-hidden bg-white mb-4 mt-6 shadow-sm transition-all duration-200">
      {/* Header Bar - Row 1: Title & Expand Toggle */}
      <div 
        id="product-info-header"
        className="px-5 py-3 bg-gradient-to-r from-slate-50 via-slate-50/90 to-blue-50/20 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#1677ff]/10 border border-[#1677ff]/20 flex items-center justify-center text-[#1677ff] shadow-2xs">
            <Package className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-bold text-slate-800 tracking-tight">产品信息</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button" 
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors"
            title={isExpanded ? "收起产品信息" : "展开产品信息"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Row 2: Selected Product Details (Connected unified white background card) */}
      {selectedProduct && (
        <div className="px-5 py-3 bg-white border-b border-slate-200/80">
          <div className="w-full bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
            {/* Unified connected product properties */}
            <div className="flex flex-wrap items-center gap-y-2 text-xs text-slate-700 divide-x divide-slate-200">
              {/* Product Name & Code */}
              <div className="flex items-center gap-2 pr-4">
                <Cpu className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold text-slate-900 text-sm">{selectedProduct.productName}</span>
                <span className="font-mono text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded text-[11px] font-medium">
                  {selectedProduct.productCode}
                </span>
              </div>

              {/* Category */}
              <div className="flex items-center gap-1.5 pl-4 pr-4">
                <span className="text-slate-400">产品分类:</span>
                <span className="text-slate-800 font-medium">{selectedProduct.category}</span>
              </div>

              {/* Specification */}
              <div className="flex items-center gap-1.5 pl-4 pr-4">
                <span className="text-slate-400">规格:</span>
                <span className="text-slate-800 font-medium max-w-[200px] truncate" title={selectedProduct.specification}>
                  {selectedProduct.specification || '标准规格'}
                </span>
              </div>

              {/* Routing Name */}
              <div className="flex items-center gap-1.5 pl-4">
                <span className="text-slate-400">工艺路线:</span>
                <span className="text-slate-800 font-medium max-w-[220px] truncate" title={selectedProduct.routingName}>
                  {selectedProduct.routingName || '标准工艺路线'}
                </span>
              </div>
            </div>

            {/* Production Quantity (Unified right section) */}
            <div className="flex items-center gap-2 shrink-0 border-l border-slate-200 pl-4 py-0.5">
              <span className="text-slate-500 text-xs font-medium">工单计划生产:</span>
              <div className="flex items-baseline gap-1 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-md text-blue-900 shadow-2xs">
                <strong className="font-mono font-bold text-blue-600 text-base">{selectedProduct.productionQuantity}</strong>
                <span className="text-xs text-blue-700 font-medium">{selectedProduct.unit}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Content Area */}
      {isExpanded && (
        <div id="product-info-body" className="p-5 flex flex-col gap-4 bg-slate-50/30">
          {products.length === 0 ? (
            <div className="p-8 text-center bg-amber-50/50 border border-dashed border-amber-200 rounded-xl flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <span className="text-sm font-bold text-amber-900">未找到共有产品数据</span>
              <p className="text-xs text-amber-700 max-w-md">
                当前勾选的 {selectedSalesOrderNos.length} 个销售订单之间没有完全相同的产品编码。系统仅展示多单交集共有产品，请重新选择有相符产品的销售订单进行联合排产。
              </p>
            </div>
          ) : (
            <>
              {/* Products Table List */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[760px] table-fixed">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-2 w-[4%] text-center whitespace-nowrap">选择</th>
                        <th className="py-2.5 px-2 w-[4%] text-center whitespace-nowrap">序号</th>
                        <th className="py-2.5 px-3 w-[13%] text-center whitespace-nowrap">产品编码</th>
                        <th className="py-2.5 px-4 w-[23%] text-left whitespace-nowrap">产品名称与规格</th>
                        <th className="py-2.5 px-3 w-[15%] text-center whitespace-nowrap">工艺路线</th>
                        <th className="py-2.5 px-3 w-[9%] text-center whitespace-nowrap">BOM版本</th>
                        <th className="py-2.5 px-3 w-[9%] text-center whitespace-nowrap">产品分类</th>
                        <th className="py-2.5 px-3 w-[10%] text-center whitespace-nowrap bg-slate-50/80">
                          订单数量
                        </th>
                        <th className="py-2.5 px-3 w-[13%] text-center whitespace-nowrap">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((item, idx) => {
                        const isSelected = selectedProduct?.id === item.id;
                        return (
                          <tr 
                            key={item.id}
                            onClick={() => onSelectProduct(item.id)}
                            className={cn(
                              "cursor-pointer transition-all duration-150 relative select-none",
                              isSelected 
                                ? "bg-blue-50/50 hover:bg-blue-50/70 font-medium" 
                                : "hover:bg-slate-50/80"
                            )}
                          >
                            {/* Radio select */}
                            <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <label className="flex items-center justify-center cursor-pointer p-0.5">
                                <input 
                                  type="radio" 
                                  name="selected_production_product"
                                  checked={isSelected}
                                  onChange={() => onSelectProduct(item.id)}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                              </label>
                            </td>

                            {/* Sequence number */}
                            <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                              {item.lineNo || idx + 1}
                            </td>

                            {/* Product Code */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 font-mono text-slate-700 font-semibold text-[11px] max-w-full truncate">
                                <span className="truncate">{item.productCode}</span>
                              </div>
                            </td>

                            {/* Product Name & Spec */}
                            <td className="py-2.5 px-4 text-left">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className={cn("text-xs font-bold truncate", isSelected ? "text-blue-900" : "text-slate-800")} title={item.productName}>
                                  {item.productName}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate" title={item.specification}>
                                  规格: {item.specification || '标准规格'}
                                </span>
                              </div>
                            </td>

                            {/* Process Route (工艺路线) */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-full" title={item.routingName || '标准工艺路线'}>
                                <GitBranch className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">{item.routingName || '标准工艺路线'}</span>
                              </span>
                            </td>

                            {/* BOM Version (Read-only) */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200/80 select-none">
                                {item.bomVersion && item.bomVersion !== '-' ? item.bomVersion : 'V1.0'}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-full">
                                {item.category || '通用产品'}
                              </span>
                            </td>

                            {/* Order Quantity */}
                            <td className="py-2.5 px-3 text-center bg-slate-50/40">
                              <span className="font-mono font-bold text-slate-700">
                                {item.orderQuantity || 0}
                              </span>
                              <span className="text-[11px] text-slate-400 ml-1">{item.unit}</span>
                            </td>

                            {/* Selection Status Badge */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {isSelected ? (
                                <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-2xs whitespace-nowrap shrink-0">
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  <span>已选中</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center text-[11px] text-slate-400 hover:text-blue-600 transition-colors whitespace-nowrap">
                                  点击选择
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per Sales Order Breakdown Quantity Adjustment Card */}
              {selectedProduct && selectedProduct.orderBreakdown && selectedProduct.orderBreakdown.length > 0 && (
                <div className="border border-purple-200/90 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50/80 via-slate-50 to-blue-50/40 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        生产明细调整
                      </span>
                      <span className="text-[11px] text-purple-700 bg-purple-100/80 border border-purple-200 px-2 py-0.5 rounded font-mono font-bold">
                        {selectedProduct.productName} ({selectedProduct.productCode})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>包含 <strong className="text-purple-700 font-bold">{selectedProduct.orderBreakdown.length}</strong> 个销售订单明细行</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[760px] table-fixed">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3 text-center w-[25%]">销售订单项次</th>
                          <th className="py-2.5 px-4 text-left w-[33%]">客户名称</th>
                          <th className="py-2.5 px-3 text-center w-[15%]">计划交货日期</th>
                          <th className="py-2.5 px-3 text-center w-[12%] bg-slate-100/60">订单数量</th>
                          <th className="py-2.5 px-4 text-center w-[15%] bg-purple-50/60 text-purple-900 border-l border-r border-purple-100">
                            <span>生产数量</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedProduct.orderBreakdown.map((bd) => {
                          return (
                            <tr key={bd.orderNo} className="hover:bg-purple-50/20 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600 truncate">
                                {bd.orderNo}-{bd.lineNo || 1}
                              </td>
                              <td className="py-2.5 px-4 text-left text-slate-700 font-medium truncate" title={bd.customer}>
                                {bd.customer}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                                {bd.planDeliveryDate || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600 bg-slate-50/30">
                                {bd.orderQuantity} {selectedProduct.unit}
                              </td>
                              <td className="py-2 px-4 text-center bg-purple-50/30 border-l border-r border-purple-100">
                                <div className="flex items-center justify-center gap-1">
                                  <div className="flex items-center h-7 border border-purple-300 rounded-md bg-white overflow-hidden shadow-2xs focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-400 w-28">
                                    <button 
                                      type="button"
                                      onClick={() => onUpdateBreakdownQuantity && onUpdateBreakdownQuantity(selectedProduct.id, bd.orderNo, Math.max(1, bd.productionQuantity - 1))}
                                      disabled={bd.productionQuantity <= 1}
                                      className="h-full px-1.5 text-purple-700 hover:bg-purple-100 disabled:opacity-40 transition-colors shrink-0 border-r border-purple-200 cursor-pointer"
                                      title="减少此订单排产数量"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input 
                                      type="number"
                                      min={1}
                                      value={bd.productionQuantity}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val >= 1 && onUpdateBreakdownQuantity) {
                                          onUpdateBreakdownQuantity(selectedProduct.id, bd.orderNo, val);
                                        }
                                      }}
                                      className="w-full h-full text-center text-xs font-bold font-mono text-purple-900 outline-none bg-transparent"
                                      title="修改对应销售订单的生产数量"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => onUpdateBreakdownQuantity && onUpdateBreakdownQuantity(selectedProduct.id, bd.orderNo, bd.productionQuantity + 1)}
                                      className="h-full px-1.5 text-purple-700 hover:bg-purple-100 transition-colors shrink-0 border-l border-purple-200 cursor-pointer"
                                      title="增加此订单排产数量"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-medium ml-0.5">{selectedProduct.unit}</span>
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
            </>
          )}

        </div>
      )}
    </div>
  );
}
