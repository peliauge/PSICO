import React, { useState, useMemo, useRef } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Plus, ArrowUpCircle, ArrowDownCircle, Sparkles, Edit, X, Wallet, Receipt, Upload, Loader2 } from 'lucide-react';
import { analyzeFinancialHealth, analyzeReceipt } from '../services/geminiService';

interface FinanceViewProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ transactions, onAddTransaction, onUpdateTransaction }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({ type: 'income', date: new Date().toISOString().split('T')[0] });
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  
  // Receipt Upload State
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for KPI details modal
  const [detailsModal, setDetailsModal] = useState<'income' | 'expense' | 'balance' | null>(null);

  const { income, expense, balance, chartData } = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const exp = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    
    // Group by month for chart
    const dataMap = new Map();
    transactions.forEach(t => {
      const month = new Date(t.date).toLocaleString('es-ES', { month: 'short' });
      if (!dataMap.has(month)) dataMap.set(month, { name: month, income: 0, expense: 0 });
      const entry = dataMap.get(month);
      if (t.type === 'income') entry.income += t.amount;
      else entry.expense += t.amount;
    });

    return {
      income: inc,
      expense: exp,
      balance: inc - exp,
      chartData: Array.from(dataMap.values())
    };
  }, [transactions]);

  // Reset receipt state when opening form for new entry
  const handleNew = () => {
    setFormData({ type: 'income', date: new Date().toISOString().split('T')[0] });
    setReceiptFile(null);
    setAnalyzingReceipt(false);
    setIsFormOpen(true);
  };

  const handleEdit = (t: Transaction) => {
    setFormData({ ...t });
    setReceiptFile(null);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (formData.description && formData.amount) {
      const transactionToSave: Transaction = {
        id: formData.id || Date.now().toString(),
        date: formData.date || new Date().toISOString().split('T')[0],
        description: formData.description,
        amount: Number(formData.amount),
        type: formData.type || 'income',
        category: formData.category || 'General'
      };

      if (formData.id) {
        onUpdateTransaction(transactionToSave);
      } else {
        onAddTransaction(transactionToSave);
      }
      
      setIsFormOpen(false);
      setFormData({ type: 'income', date: new Date().toISOString().split('T')[0] });
      setReceiptFile(null);
    }
  };

  const exportToCSV = () => {
    const headers = ["ID", "Fecha", "Descripción", "Tipo", "Categoría", "Monto"];
    const rows = transactions.map(t => [t.id, t.date, t.description, t.type, t.category, t.amount]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "finanzas_consulta.csv");
    document.body.appendChild(link);
    link.click();
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const trend = balance > 0 ? "Positiva" : "Negativa";
    const analysis = await analyzeFinancialHealth(income, expense, trend);
    setAiAnalysis(analysis);
    setAnalyzing(false);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleProcessReceipt = async () => {
    if (!receiptFile) return;

    setAnalyzingReceipt(true);
    const reader = new FileReader();
    reader.readAsDataURL(receiptFile);
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      // Remove data:image/xxx;base64, prefix
      const base64Data = base64String.split(',')[1];
      const mimeType = base64String.split(';')[0].split(':')[1];

      const result = await analyzeReceipt(base64Data, mimeType);
      
      if (result) {
        setFormData(prev => ({
          ...prev,
          date: result.date || prev.date,
          amount: result.amount || prev.amount,
          description: result.description ? (result.cif ? `${result.description} (${result.cif})` : result.description) : prev.description,
          category: result.category || prev.category,
          type: 'expense' // Usually receipts are expenses
        }));
      } else {
        alert("No se pudo analizar el ticket. Inténtalo de nuevo o rellena manualmente.");
      }
      setAnalyzingReceipt(false);
    };
  };

  const getFilteredTransactions = () => {
    if (!detailsModal) return [];
    if (detailsModal === 'income') return transactions.filter(t => t.type === 'income');
    if (detailsModal === 'expense') return transactions.filter(t => t.type === 'expense');
    return transactions; // balance shows all
  };

  const filteredTransactions = getFilteredTransactions();
  const filteredTotal = filteredTransactions.reduce((acc, curr) => {
     if (detailsModal === 'balance') {
         return acc + (curr.type === 'income' ? curr.amount : -curr.amount);
     }
     return acc + curr.amount;
  }, 0);

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestión Financiera</h2>
        <div className="flex gap-3">
          <button onClick={handleAnalyze} className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors">
            {analyzing ? 'Analizando...' : <><Sparkles size={18}/> Análisis IA</>}
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={18}/> Exportar CSV
          </button>
          <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
            <Plus size={18}/> Registrar
          </button>
        </div>
      </div>

      {/* AI Insight Box */}
      {aiAnalysis && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg text-indigo-800 text-sm animate-fade-in flex items-start gap-3">
            <Sparkles size={20} className="text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <strong>Análisis Financiero IA:</strong> {aiAnalysis}
            </div>
        </div>
      )}

      {/* Cards - Interactive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
            onClick={() => setDetailsModal('income')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
               <ArrowUpCircle className="text-emerald-500" size={24} />
            </div>
            <span className="text-slate-500 text-sm font-medium">Ingresos Totales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{income.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</p>
        </div>

        <div 
            onClick={() => setDetailsModal('expense')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-rose-200 transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-rose-50 rounded-lg group-hover:bg-rose-100 transition-colors">
                <ArrowDownCircle className="text-rose-500" size={24} />
             </div>
            <span className="text-slate-500 text-sm font-medium">Gastos Totales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{expense.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</p>
        </div>

        <div 
            onClick={() => setDetailsModal('balance')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <Wallet className="text-indigo-500" size={24} />
             </div>
             <span className="text-slate-500 text-sm font-medium">Balance Neto</span>
          </div>
          <p className={`text-2xl font-bold mt-2 ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {balance.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
        <h3 className="font-semibold text-slate-700 mb-4">Flujo de Caja (Últimos Meses)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
            <Tooltip 
              cursor={{fill: '#f8fafc'}}
              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
            />
            <Legend />
            <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
            <Bar dataKey="expense" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <h3 className="font-semibold text-slate-700">Historial de Transacciones</h3>
             <span className="text-xs text-slate-400">Clic en una fila para editar</span>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="p-4">Fecha</th>
              <th className="p-4">Descripción</th>
              <th className="p-4">Categoría</th>
              <th className="p-4 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
                <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">No hay transacciones registradas.</td>
                </tr>
            ) : (
                transactions.slice().reverse().map(t => (
                <tr 
                    key={t.id} 
                    onClick={() => handleEdit(t)}
                    className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer group transition-colors duration-150"
                >
                    <td className="p-4 text-slate-600">{t.date}</td>
                    <td className="p-4 font-medium text-slate-800">{t.description}</td>
                    <td className="p-4">
                    <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs border border-gray-200">{t.category}</span>
                    </td>
                    <td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <div className="flex items-center justify-end gap-3">
                            <span>{t.type === 'income' ? '+' : '-'} {t.amount} €</span>
                            <Edit size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* KPI Details Modal */}
      {detailsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 animate-fade-in p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-slate-100">
                  <div className="flex justify-between items-center p-6 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                          {detailsModal === 'income' && <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><ArrowUpCircle size={24}/></div>}
                          {detailsModal === 'expense' && <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><ArrowDownCircle size={24}/></div>}
                          {detailsModal === 'balance' && <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Wallet size={24}/></div>}
                          
                          <div>
                             <h3 className="text-xl font-bold text-slate-800">
                                {detailsModal === 'income' ? 'Detalle de Ingresos' : detailsModal === 'expense' ? 'Detalle de Gastos' : 'Detalle del Balance'}
                             </h3>
                             <p className="text-sm text-slate-500">Listado completo de transacciones relacionadas</p>
                          </div>
                      </div>
                      <button onClick={() => setDetailsModal(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="overflow-y-auto p-0 flex-1">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                             {filteredTransactions.length === 0 ? (
                                 <tr>
                                     <td colSpan={4} className="p-8 text-center text-slate-400">No hay datos para mostrar.</td>
                                 </tr>
                             ) : (
                                 filteredTransactions.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                                     <tr key={t.id} onClick={() => handleEdit(t)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer group">
                                         <td className="p-4 text-slate-600">{t.date}</td>
                                         <td className="p-4 font-medium text-slate-800">{t.description}</td>
                                         <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs border ${t.type === 'income' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                {t.category}
                                            </span>
                                         </td>
                                         <td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            <div className="flex items-center justify-end gap-3">
                                                <span>{t.type === 'income' ? '+' : '-'} {t.amount} €</span>
                                                <Edit size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                         </td>
                                     </tr>
                                 ))
                             )}
                        </tbody>
                     </table>
                  </div>
                  
                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                      <span className="text-slate-500 font-medium uppercase text-xs tracking-wider">Total Seleccionado</span>
                      <span className={`text-2xl font-bold ${filteredTotal >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                          {filteredTotal.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
                      </span>
                  </div>
              </div>
          </div>
      )}

      {/* Transaction Form Modal (Add/Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">
                    {formData.id ? 'Editar Transacción' : 'Nueva Transacción'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => setFormData({...formData, type: 'income'})} 
                    className={`py-2.5 rounded-lg font-medium transition-all ${formData.type === 'income' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                >
                    Ingreso
                </button>
                <button 
                    onClick={() => setFormData({...formData, type: 'expense'})} 
                    className={`py-2.5 rounded-lg font-medium transition-all ${formData.type === 'expense' ? 'bg-rose-100 text-rose-700 border-2 border-rose-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                >
                    Gasto
                </button>
              </div>

              {/* Receipt Upload Section (Only for expenses or new items) */}
              {formData.type === 'expense' && (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 text-center relative">
                   <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden" 
                   />
                   
                   {!receiptFile ? (
                     <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer flex flex-col items-center gap-2 py-2 hover:opacity-70 transition-opacity">
                        <Receipt size={24} className="text-slate-400" />
                        <p className="text-xs text-slate-500 font-medium">Subir ticket / factura</p>
                     </div>
                   ) : (
                     <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                        <span className="text-xs text-slate-600 truncate max-w-[150px]">{receiptFile.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setReceiptFile(null); }} className="text-rose-500 hover:text-rose-700 p-1"><X size={14}/></button>
                     </div>
                   )}

                   {receiptFile && (
                     <button 
                        onClick={handleProcessReceipt} 
                        disabled={analyzingReceipt}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-1.5 rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                     >
                        {analyzingReceipt ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                        {analyzingReceipt ? 'Analizando...' : 'Analizar con IA'}
                     </button>
                   )}
                </div>
              )}

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-black" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                   />
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción / Empresa</label>
                  <input 
                    placeholder="Ej. Papelería Técnica S.L." 
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-black" 
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                  />
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <input 
                    placeholder="Ej. Infraestructura, Material, Alquiler..." 
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-black" 
                    value={formData.category || ''}
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                   />
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto (€)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono bg-white text-black" 
                    value={formData.amount || ''}
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                   />
              </div>

              <div className="pt-4 flex gap-3">
                  <button onClick={() => setIsFormOpen(false)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 font-medium shadow-sm transition-colors">
                    {formData.id ? 'Guardar Cambios' : 'Registrar'}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};