import React, { useState, useMemo } from 'react';
import { Appointment, Patient, SessionType } from '../types';
import { ChevronLeft, ChevronRight, Plus, MessageSquare, Check, X, Mail, Copy, Calendar as CalendarIcon, Clock, AlignJustify, Filter, Smartphone } from 'lucide-react';
import { generateAppointmentReminder } from '../services/geminiService';

interface CalendarViewProps {
  appointments: Appointment[];
  patients: Patient[];
  onAddAppointment: (a: Appointment) => void;
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
}

type ViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC<CalendarViewProps> = ({ appointments, patients, onAddAppointment, onUpdateStatus }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showModal, setShowModal] = useState(false);
  const [newApt, setNewApt] = useState<Partial<Appointment>>({ durationMinutes: 60, type: SessionType.FOLLOW_UP });
  
  // Filters State
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | SessionType>('all');

  // Store both text and the specific appointment
  const [reminderData, setReminderData] = useState<{text: string, appointment: Appointment} | null>(null);
  const [loadingReminder, setLoadingReminder] = useState(false);

  // Helpers for navigation
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || 'Desconocido';

  const formatPatientName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1) {
      // Returns "F. Lastname Lastname..."
      return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
    }
    return fullName;
  };

  // --- Filtering Logic ---
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
      const matchesType = typeFilter === 'all' || apt.type === typeFilter;
      return matchesStatus && matchesType;
    });
  }, [appointments, statusFilter, typeFilter]);

  // --- Logic for Month View ---
  const renderMonthView = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday
    // Adjust for Monday start (0->6, 1->0, etc)
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    const totalSlots = startOffset + daysInMonth;
    const numWeeks = Math.ceil(totalSlots / 7);

    const days = [];
    // Empty slots
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="bg-slate-50 border-r border-b border-slate-100"></div>);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      // Use filteredAppointments instead of appointments
      const dayApts = filteredAppointments.filter(a => a.date.startsWith(dateStr));

      days.push(
        <div key={d} className="border-r border-b border-slate-100 p-1 lg:p-2 relative hover:bg-slate-50 transition-colors group overflow-hidden bg-white flex flex-col">
          <span className={`text-xs font-semibold mb-1 ${new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString() ? 'text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full w-fit' : 'text-slate-400'}`}>{d}</span>
          <div className="space-y-1 overflow-y-auto flex-1 min-h-0 scrollbar-hide">
            {dayApts.map(apt => renderAppointmentCompact(apt))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-7 border-b border-slate-200 flex-shrink-0">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="bg-slate-50 p-2 text-center font-medium text-slate-500 text-xs uppercase tracking-wider border-r border-slate-200 last:border-r-0">{day}</div>
            ))}
        </div>
        <div className="grid grid-cols-7 flex-1 border-l border-slate-200" style={{ gridTemplateRows: `repeat(${numWeeks}, minmax(0, 1fr))` }}>
            {days}
        </div>
      </div>
    );
  };

  // --- Logic for Week & Day View ---
  // Extended hours from 8 to 21 (14 slots)
  const workingHours = Array.from({ length: 14 }, (_, i) => i + 8); 

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const renderTimeSlot = (date: Date, hour: number) => {
    const dateStr = date.toISOString().split('T')[0];
    // Use filteredAppointments instead of appointments
    const slotApts = filteredAppointments.filter(a => {
      const aDate = new Date(a.date);
      return aDate.toISOString().split('T')[0] === dateStr && aDate.getHours() === hour;
    });

    return (
      <div key={`${dateStr}-${hour}`} className="border-b border-r border-slate-100 relative group hover:bg-slate-50 flex-1 min-h-0">
        {slotApts.map(apt => renderAppointmentCard(apt))}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-8 border-b border-slate-200 bg-white z-10 flex-shrink-0">
          <div className="p-2 lg:p-4 text-center text-xs font-semibold text-slate-400 uppercase flex items-center justify-center">Hora</div>
          {weekDays.map((d, i) => (
            <div key={i} className={`p-2 text-center border-l border-slate-100 ${d.toDateString() === new Date().toDateString() ? 'bg-teal-50' : ''}`}>
              <div className="text-xs text-slate-500 uppercase">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
              <div className={`font-bold text-lg ${d.toDateString() === new Date().toDateString() ? 'text-teal-600' : 'text-slate-800'}`}>{d.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8 flex-1 min-h-0">
           {/* Time Labels Column */}
           <div className="bg-slate-50 border-r border-slate-200 flex flex-col h-full">
             {workingHours.map(h => (
               <div key={h} className="flex-1 min-h-0 border-b border-slate-200 text-xs text-slate-400 flex items-center justify-center">
                 {h}:00
               </div>
             ))}
           </div>
           {/* Days Columns */}
           {weekDays.map((d, i) => (
             <div key={i} className="bg-white flex flex-col h-full">
               {workingHours.map(h => renderTimeSlot(d, h))}
             </div>
           ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-[80px_1fr] border-b border-slate-200 bg-white z-10 flex-shrink-0">
           <div className="p-2 lg:p-4 text-center text-xs font-semibold text-slate-400 uppercase flex items-center justify-center">Hora</div>
           <div className="p-2 text-left pl-4 border-l border-slate-100">
              <div className="text-xs text-slate-500 uppercase">{currentDate.toLocaleDateString('es-ES', { weekday: 'long' })}</div>
              <div className="font-bold text-2xl text-slate-800">{currentDate.getDate()} {currentDate.toLocaleDateString('es-ES', { month: 'long' })}</div>
           </div>
        </div>
        <div className="grid grid-cols-[80px_1fr] flex-1 min-h-0">
           <div className="bg-slate-50 border-r border-slate-200 flex flex-col h-full">
             {workingHours.map(h => (
               <div key={h} className="flex-1 min-h-0 border-b border-slate-200 text-xs text-slate-400 flex items-center justify-center">
                 {h}:00
               </div>
             ))}
           </div>
           <div className="bg-white flex flex-col h-full relative">
              {workingHours.map(h => renderTimeSlot(currentDate, h))}
           </div>
        </div>
      </div>
    );
  };

  // --- Component Renderers ---

  const renderAppointmentCompact = (apt: Appointment) => (
    <div key={apt.id} className={`text-[10px] lg:text-xs p-1 rounded border truncate cursor-pointer mb-1 relative group ${apt.status === 'scheduled' ? 'bg-teal-50 border-teal-200 text-teal-800' : apt.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-70' : 'bg-rose-50 border-rose-200 text-rose-800 opacity-60 line-through'}`}>
      <div className="font-semibold">{new Date(apt.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
      <div className="truncate">{formatPatientName(getPatientName(apt.patientId))}</div>
      {renderHoverActions(apt)}
    </div>
  );

  const renderAppointmentCard = (apt: Appointment) => (
    <div key={apt.id} className={`absolute inset-x-1 top-1 bottom-1 p-1.5 lg:p-2 rounded border shadow-sm text-[10px] lg:text-xs overflow-hidden cursor-pointer z-10 group ${apt.status === 'scheduled' ? 'bg-teal-100 border-teal-200 text-teal-900' : apt.status === 'completed' ? 'bg-emerald-100 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900 opacity-60'}`}>
      <div className="flex justify-between items-start">
        <span className="font-bold">{new Date(apt.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        {renderHoverActions(apt)}
      </div>
      <div className="font-medium mt-0.5 lg:mt-1 truncate">{formatPatientName(getPatientName(apt.patientId))}</div>
      <div className="text-[9px] lg:text-[10px] opacity-80">{apt.type}</div>
      {apt.status === 'cancelled' && <div className="text-[9px] font-bold text-rose-600">CANCELADA</div>}
    </div>
  );

  const renderHoverActions = (apt: Appointment) => (
    <div className="hidden group-hover:flex absolute top-1 right-1 bg-white shadow-md rounded-md border border-slate-100 p-0.5 gap-1 z-20">
      <button title="Recordatorio" onClick={(e) => {e.stopPropagation(); handleGenerateReminder(apt);}} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><MessageSquare size={12}/></button>
      {apt.status === 'scheduled' && (
        <>
           <button title="Completar" onClick={(e) => {e.stopPropagation(); onUpdateStatus(apt.id, 'completed');}} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded"><Check size={12}/></button>
           <button title="Cancelar" onClick={(e) => {e.stopPropagation(); onUpdateStatus(apt.id, 'cancelled');}} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><X size={12}/></button>
        </>
      )}
    </div>
  );

  // --- Main Interactions ---

  const handleSave = () => {
    if (newApt.patientId && newApt.date && newApt.type) {
      onAddAppointment({
        id: Date.now().toString(),
        patientId: newApt.patientId,
        date: newApt.date,
        durationMinutes: newApt.durationMinutes || 60,
        type: newApt.type,
        status: 'scheduled'
      });
      setShowModal(false);
      setNewApt({ durationMinutes: 60, type: SessionType.FOLLOW_UP });
    }
  };

  const handleGenerateReminder = async (apt: Appointment) => {
    setLoadingReminder(true);
    const pName = getPatientName(apt.patientId);
    const dateStr = new Date(apt.date).toLocaleDateString();
    const timeStr = new Date(apt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const text = await generateAppointmentReminder(pName, dateStr, timeStr);
    setReminderData({ text, appointment: apt });
    setLoadingReminder(false);
  };

  const handleSendEmail = () => {
    if (!reminderData) return;
    const patient = patients.find(p => p.id === reminderData.appointment.patientId);
    
    if (!patient?.email) {
      alert("El paciente no tiene un email registrado.");
      return;
    }

    const subject = `Recordatorio de Cita - ${new Date(reminderData.appointment.date).toLocaleDateString()}`;
    const body = reminderData.text;
    window.location.href = `mailto:${patient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSendWhatsApp = () => {
    if (!reminderData) return;
    const patient = patients.find(p => p.id === reminderData.appointment.patientId);
    
    const phone = patient?.phone?.replace(/\D/g, '') || '';
    const text = encodeURIComponent(reminderData.text);
    
    // If we have a phone number, we try to use it. Otherwise just open WhatsApp with the text.
    const url = phone 
        ? `https://wa.me/${phone}?text=${text}`
        : `https://wa.me/?text=${text}`;
        
    window.open(url, '_blank');
  };

  const getDateLabel = () => {
    const opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    if (viewMode === 'month') return currentDate.toLocaleString('es-ES', opts).toUpperCase();
    if (viewMode === 'day') return currentDate.toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    
    // Week Label
    const start = getWeekDays()[0];
    const end = getWeekDays()[6];
    return `${start.getDate()} ${start.toLocaleString('es-ES', { month: 'short'})} - ${end.getDate()} ${end.toLocaleString('es-ES', { month: 'short'})}, ${end.getFullYear()}`.toUpperCase();
  };

  return (
    <div className="p-4 md:p-6 h-full md:h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 lg:mb-6 gap-4 flex-shrink-0">
        <div className="flex items-center gap-4 w-full xl:w-auto justify-between">
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 min-w-[200px] lg:min-w-[250px]">
            {getDateLabel()}
          </h2>
          <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
            <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600"><ChevronLeft size={20}/></button>
            <div className="w-px bg-slate-200 mx-1"></div>
            <button onClick={() => navigate('next')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600"><ChevronRight size={20}/></button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3 w-full xl:w-auto justify-end">
          {/* Filters */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm h-[38px] w-full md:w-auto">
             <div className="pl-2 pr-1 text-slate-400"><Filter size={16}/></div>
             <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 md:flex-none text-sm bg-transparent text-slate-600 font-medium focus:outline-none border-none cursor-pointer w-full md:w-auto"
             >
                <option value="all">Estado</option>
                <option value="scheduled">Programada</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
             </select>
             <div className="w-px h-4 bg-slate-200 mx-1"></div>
             <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="flex-1 md:flex-none text-sm bg-transparent text-slate-600 font-medium focus:outline-none border-none cursor-pointer w-full md:w-auto"
             >
                <option value="all">Tipo</option>
                {Object.values(SessionType).map(t => (
                    <option key={t} value={t}>{t}</option>
                ))}
             </select>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
              {/* View Switcher */}
              <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm h-[38px] items-center flex-1 md:flex-none justify-center md:justify-start">
                <button 
                  onClick={() => setViewMode('month')}
                  className={`flex-1 md:flex-none px-2 lg:px-3 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-2 h-full ${viewMode === 'month' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <CalendarIcon size={16}/> <span className="inline">Mes</span>
                </button>
                <button 
                  onClick={() => setViewMode('week')}
                  className={`flex-1 md:flex-none px-2 lg:px-3 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-2 h-full ${viewMode === 'week' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <AlignJustify size={16}/> <span className="inline">Sem</span>
                </button>
                <button 
                  onClick={() => setViewMode('day')}
                  className={`flex-1 md:flex-none px-2 lg:px-3 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-2 h-full ${viewMode === 'day' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Clock size={16}/> <span className="inline">Día</span>
                </button>
              </div>

              <button 
                onClick={() => setShowModal(true)}
                className="bg-teal-600 text-white px-3 lg:px-4 h-[38px] rounded-lg hover:bg-teal-700 flex items-center justify-center gap-2 shadow-sm transition-colors text-sm lg:text-base flex-shrink-0"
              >
                <Plus size={18}/> <span className="hidden sm:inline">Nueva Cita</span>
              </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col min-h-0">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>

      {/* Reminder Modal */}
      {reminderData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full border border-slate-100">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Recordatorio Inteligente</h3>
                    <p className="text-xs text-slate-500">Generado con Gemini 2.5 Flash</p>
                </div>
                <button onClick={() => setReminderData(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 relative group">
                <textarea 
                readOnly 
                className="w-full h-32 bg-transparent text-sm text-slate-700 resize-none focus:outline-none"
                value={reminderData.text}
                />
                <button 
                    onClick={() => navigator.clipboard.writeText(reminderData.text)}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded shadow-sm border border-slate-200 text-slate-400 hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copiar texto"
                >
                    <Copy size={14} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                 <button 
                    onClick={handleSendWhatsApp}
                    className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 rounded-lg hover:bg-[#128C7E] transition-colors font-medium shadow-sm"
                >
                    <Smartphone size={18}/> WhatsApp
                </button>
                <button 
                    onClick={handleSendEmail}
                    className="flex items-center justify-center gap-2 bg-teal-600 text-white py-2.5 rounded-lg hover:bg-teal-700 transition-colors font-medium shadow-sm"
                >
                    <Mail size={18}/> Email
                </button>
            </div>
            <button 
                onClick={() => setReminderData(null)} 
                className="w-full py-2 text-slate-500 hover:text-slate-800 font-medium text-sm"
            >
                Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Add Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Agendar Cita</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label>
                <select 
                  className="w-full p-2 border rounded bg-white text-black border-slate-300"
                  onChange={e => setNewApt({...newApt, patientId: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha y Hora</label>
                <input 
                  type="datetime-local" 
                  className="w-full p-2 border rounded bg-white text-black border-slate-300"
                  onChange={e => setNewApt({...newApt, date: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <select 
                   className="w-full p-2 border rounded bg-white text-black border-slate-300"
                   onChange={e => setNewApt({...newApt, type: e.target.value as SessionType})}
                   value={newApt.type}
                >
                  {Object.values(SessionType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <button onClick={handleSave} className="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700 mt-4">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      
       {/* Loading Overlay */}
       {loadingReminder && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] bg-white bg-opacity-70">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      )}
    </div>
  );
};