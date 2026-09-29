import { useState, useMemo, useEffect } from 'react';
import type { BomCompositionItem } from '../types';
import { initialBomCompositionList } from '../data';
import { Image as ImageIcon, GripHorizontal, Plus, Minus, Search, ChevronLeft, ChevronRight, Filter, Layers, CheckCircle2 } from 'lucide-react';

interface BomCompositionTableProps {
  defaultBomVersion?: string;
  productName?: string;
  productCode?: string;
}

export default function BomCompositionTable({
  defaultBomVersion = 'V2.1',
  productName,
  productCode
}: BomCompositionTableProps) {
  const [items, setItems] = useState<BomCompositionItem[]>(initialBomCompositionList);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [bomVersion, setBomVersion] = useState<string>(() => defaultBomVersion || 'V2.1');

  useEffect(() => {
    if (defaultBomVersion) {
      setBomVersion(defaultBomVersion);
    }
  }, [defaultBomVersion]);

  const updateItem = (id: string, field: keyof BomCompositionItem, value: any) => {
    setItems((prev) => 
      prev.map((item) => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const categories = ['全部', '钣金件', '机加件', '采购件'];

  const filteredItems = useMemo(() => {
    return items.filter(item => {
       const matchCat = selectedCategory === '全部' || item.category === selectedCategory;
       const matchSearch = item.materialCode.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.materialName.toLowerCase().includes(searchQuery.toLowerCase());
       return matchCat && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Dynamic versions list including default
  const availableVersions = useMemo(() => {
    const primary = defaultBomVersion || 'V2.1';
    const list = [
      { ver: primary, label: `${primary} - 默认版本 (当前所选产品带出)` }
    ];
    if (!primary.includes('V1.0')) {
      list.push({ ver: 'V1.0', label: 'V1.0 - 基础版本' });
    }
    if (!primary.includes('V1.1')) {
      list.push({ ver: 'V1.1', label: 'V1.1 - 优化版本' });
    }
    return list;
  }, [defaultBomVersion]);

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Header controls */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between shrink-0 bg-slate-50/40">
         <div className="flex items-center gap-3 w-full max-w-2xl">
           {productName && (
             <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 border border-blue-200/80 text-xs text-blue-900 font-medium shrink-0">
               <Layers className="w-3.5 h-3.5 text-blue-600" />
               <span className="text-slate-500">产品:</span>
               <span className="font-bold">{productName}</span>
             </div>
           )}
           <div className="flex items-center gap-2">
             <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">BOM版本:</span>
             <select 
               value={bomVersion}
               onChange={(e) => setBomVersion(e.target.value)}
               className="w-[230px] h-8 px-2 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 outline-none focus:border-blue-400 cursor-pointer shadow-2xs"
             >
               {availableVersions.map(v => (
                 <option key={v.ver} value={v.ver}>{v.label}</option>
               ))}
             </select>
           </div>
           <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
           <div className="relative flex-1">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input 
               type="text" 
               placeholder="通过编码/名称检索产品或物料..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors shadow-2xs"
             />
           </div>
         </div>
         <div className="hidden items-center bg-slate-100 p-1 rounded-lg">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  selectedCategory === cat 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {cat}
              </button>
            ))}
         </div>
      </div>

      {/* Table Container */}
      {!bomVersion ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
          <Filter className="w-12 h-12 mb-4 text-slate-300" />
          <p className="text-[13px]">请在上方选择 BOM 版本以查看产品组成结构</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full min-w-[1200px] text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 border-b border-slate-200 text-center w-16">排序</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center w-16">项次</th>
              <th className="px-4 py-3 border-b border-slate-200 min-w-[200px] text-center">物料信息</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">BOM版本号</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">物料封面</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">物料分类</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">业务属性</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">规格</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">品牌</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">库存</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">单位</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">单件标准用量</th>
              <th className="px-4 py-3 border-b border-slate-200 w-32 border-l border-r border-blue-100 bg-blue-50/30 text-blue-700 text-center">工单需求总量</th>
              <th className="px-4 py-3 border-b border-slate-200 w-32 border-r border-blue-100 bg-blue-50/30 text-blue-700 text-center">损耗率(%)</th>
              <th className="px-4 py-3 border-b border-slate-200 min-w-[150px] text-center">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length > 0 ? filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                    <GripHorizontal className="w-5 h-5" />
                  </div>
                </td>
                <td className="px-4 py-4 text-center text-sm font-mono text-slate-500">
                  {item.itemSeq}
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold text-slate-700">{item.materialName}</span>
                    <span className="text-xs text-slate-400 font-mono mt-0.5">{item.materialCode}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center text-sm text-slate-600">{item.bomVersion}</td>
                <td className="px-4 py-4 text-center">
                   <div className="inline-flex flex-col items-center justify-center w-12 h-12 bg-slate-100 border border-slate-200 rounded text-slate-300">
                      <ImageIcon className="w-4 h-4 mb-0.5" />
                      <span className="text-[8px] leading-tight">暂无图片</span>
                   </div>
                </td>
                <td className="px-4 py-4 text-center text-sm text-slate-600">{item.category}</td>
                <td className="px-4 py-4 text-center text-sm text-slate-600">{item.businessAttr}</td>
                <td className="px-4 py-4 text-center text-sm text-slate-600">{item.specification}</td>
                <td className="px-4 py-4 text-center text-sm text-slate-600">{item.brand}</td>
                <td className="px-4 py-4 text-center text-sm font-mono text-slate-700">{item.inventory}</td>
                <td className="px-4 py-4 text-center text-sm text-slate-600">{item.unit}</td>
                <td className="px-4 py-4 text-center text-sm font-mono text-slate-700">{item.standardUsage.toFixed(4)}</td>
                
                {/* 工单需求总量 Editable */}
                <td className="px-3 py-3 border-l border-r border-blue-50 bg-blue-50/10">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center border border-slate-300 rounded-[4px] bg-white overflow-hidden h-7">
                      <button 
                        onClick={() => updateItem(item.id, 'totalDemand', Math.max(0, item.totalDemand - 1))}
                        className="w-7 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors border-r border-slate-200"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input 
                        type="number" 
                        value={item.totalDemand}
                        onChange={(e) => updateItem(item.id, 'totalDemand', Number(e.target.value))}
                        className="w-12 h-full text-center text-sm font-mono text-slate-700 outline-none p-0 focus:ring-inset focus:ring-1 focus:ring-[#1677ff] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button 
                        onClick={() => updateItem(item.id, 'totalDemand', item.totalDemand + 1)}
                        className="w-7 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors border-l border-slate-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </td>

                {/* 损耗率 Editable */}
                <td className="px-3 py-3 border-r border-blue-50 bg-blue-50/10">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center border border-slate-300 rounded-[4px] bg-white overflow-hidden h-7">
                      <button 
                        onClick={() => updateItem(item.id, 'scrapRate', Math.max(0, parseFloat((item.scrapRate - 0.1).toFixed(2))))}
                        className="w-7 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors border-r border-slate-200"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input 
                        type="number" 
                        value={item.scrapRate}
                        step="0.1"
                        onChange={(e) => updateItem(item.id, 'scrapRate', Number(e.target.value))}
                        className="w-12 h-full text-center text-sm font-mono text-slate-700 outline-none p-0 focus:ring-inset focus:ring-1 focus:ring-[#1677ff] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button 
                        onClick={() => updateItem(item.id, 'scrapRate', parseFloat((item.scrapRate + 0.1).toFixed(2)))}
                        className="w-7 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors border-l border-slate-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </td>

                {/* 备注 Editable */}
                <td className="px-4 py-3 text-center">
                  <input 
                    type="text" 
                    value={item.remark}
                    onChange={(e) => updateItem(item.id, 'remark', e.target.value)}
                    placeholder="-"
                    className="w-full text-center text-sm text-slate-600 px-2 py-1.5 bg-transparent border border-transparent rounded hover:border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none transition-all"
                  />
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={15} className="py-8 text-center text-slate-400 text-sm">
                  没有找到符合条件的物料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
        <span className="text-xs text-slate-500">
          共 {filteredItems.length} 条数据
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">每页</span>
            <select className="text-xs border border-slate-200 rounded bg-white px-2 py-1 outline-none focus:border-blue-400 text-slate-600 cursor-pointer">
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
            <span className="text-xs text-slate-500">条</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 disabled:opacity-50" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-6 h-6 rounded bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </button>
            <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 disabled:opacity-50" disabled>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}