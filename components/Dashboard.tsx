import React, { useMemo } from 'react';
import { Patient, Appointment, Transaction, Tab } from '../types';
import { Users, Calendar, TrendingUp, AlertCircle, Clock, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  patients: Patient[];
  appointments: Appointment[];
  transactions: Transaction[];
  onNavigate: (tab: Tab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ patients, appointments, transactions, onNavigate }) => {
  
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // --- Helper: Get start of current week (Monday) ---
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // --- Helper: Get end of current week (Sunday) ---
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // --- 1. Monthly Appointments (Accumulated) ---
    const monthlyAppointments = appointments.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // --- 2. Weekly Appointments ---
    const weeklyAppointments = appointments.filter(a => {
      const d = new Date(a.date);
      return d >= startOfWeek && d <= endOfWeek;
    }).length;

    // --- 3. Monthly Income ---
    const monthlyIncome = transactions
      .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // --- 4. Chart Data: Daily Appointments for Current Week (Mon-Fri only) ---
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
    const dailyData = weekDays.map((dayName, index) => {
      const currentDayDate = new Date(startOfWeek);
      currentDayDate.setDate(startOfWeek.getDate() + index);
      const dateStr = currentDayDate.toISOString().split('T')[0];

      const count = appointments.filter(a => a.date.startsWith(dateStr)).length;
      
      return {
        name: dayName,
        citas: count,
        date: dateStr,
        isToday: dateStr === today.toISOString().split('T')[0]
      };
    });

    // --- 5. Active Patients ---
    const activePatients = patients.filter(p => p.active).length;

    return {
      activePatients,
      monthlyAppointments,
      weeklyAppointments,
      monthlyIncome,
      dailyData
    };
  }, [patients, appointments, transactions]);

  return (
    <div className="p-6 space-y-6 animate-fade-in h-[calc(100vh-4rem)] overflow-y-auto">
      <h2 className="text-2xl font-bold text-slate-800">Resumen</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Citas Semanales -> Calendar */}
        <div 
          onClick={() => onNavigate(Tab.CALENDAR)}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-teal-200 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
               <Clock size={24} />
             </div>
             <span className="text-xs font-medium text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Esta Semana</span>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Citas Semanales</p>
            <p className="text-3xl font-bold text-slate-800">{stats.weeklyAppointments}</p>
          </div>
        </div>

        {/* Citas Mensuales -> Calendar */}
        <div 
          onClick={() => onNavigate(Tab.CALENDAR)}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-teal-200 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
               <Calendar size={24} />
             </div>
             <span className="text-xs font-medium text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Este Mes</span>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Citas Acumuladas</p>
            <p className="text-3xl font-bold text-slate-800">{stats.monthlyAppointments}</p>
          </div>
        </div>

        {/* Ingresos -> Finance */}
        <div 
          onClick={() => onNavigate(Tab.FINANCE)}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-teal-200 transition-all"
        >
           <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
               <TrendingUp size={24} />
             </div>
             <span className="text-xs font-medium text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Facturación</span>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Ingresos (Mes)</p>
            <p className="text-3xl font-bold text-slate-800">{stats.monthlyIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        {/* Pacientes Activos -> Patients */}
        <div 
          onClick={() => onNavigate(Tab.PATIENTS)}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-teal-200 transition-all"
        >
           <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-teal-100 text-teal-600 rounded-full">
               <Users size={24} />
             </div>
             <span className="text-xs font-medium text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Total</span>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pacientes Activos</p>
            <p className="text-3xl font-bold text-slate-800">{stats.activePatients}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2 h-80">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-teal-600"/>
              Actividad de Citas (Lunes a Viernes)
            </h3>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="citas" name="Citas" radius={[4, 4, 0, 0]} barSize={40}>
                  {stats.dailyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isToday ? '#0d9488' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tip / Advice Section */}
        <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl flex flex-col gap-3 h-full justify-center">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                    <AlertCircle size={20} />
                    <h3>Consejo del Día</h3>
                </div>
                <p className="text-indigo-800 text-sm leading-relaxed">
                    Recuerda revisar las notas pendientes de las sesiones de ayer para asegurar un historial clínico completo. 
                    Utiliza la herramienta de IA en la sección de pacientes para agilizar la redacción.
                </p>
                <div className="mt-2 pt-4 border-t border-indigo-100">
                     <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Próxima Cita:</p>
                     {appointments.filter(a => new Date(a.date) > new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ? (
                        <div className="mt-1">
                            <span className="font-bold text-indigo-900">
                                {new Date(appointments.filter(a => new Date(a.date) > new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <span className="text-indigo-700 ml-2">
                                - {patients.find(p => p.id === appointments.filter(a => new Date(a.date) > new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].patientId)?.name || 'Paciente'}
                            </span>
                        </div>
                     ) : (
                         <span className="text-indigo-400 text-sm italic">No hay citas próximas hoy.</span>
                     )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};