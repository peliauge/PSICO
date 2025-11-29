import React, { useState, useEffect } from 'react';
import { Tab, Patient, Appointment, Transaction, UserProfile } from './types';
import { Dashboard } from './components/Dashboard';
import { PatientsView } from './components/PatientsView';
import { CalendarView } from './components/CalendarView';
import { FinanceView } from './components/FinanceView';
import { LoginView } from './components/LoginView';
import { LayoutDashboard, Users, Calendar, PiggyBank, Activity, LogOut } from 'lucide-react';

const App: React.FC = () => {
  // Initialize user from localStorage to persist session
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('psico_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('psico_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('psico_user');
    }
  }, [user]);

  // Mock Data / Local Storage could be implemented here
  const [patients, setPatients] = useState<Patient[]>([
    { 
      id: '1', 
      name: 'Ana García', 
      email: 'ana.garcia@email.com', 
      phone: '600 123 456', 
      age: 28, 
      startDate: '2023-10-01', 
      active: true,
      notes: 'Paciente refiere ansiedad en el trabajo.',
      occupation: 'Arquitecta',
      address: 'C/ Mayor 15, Madrid',
      emergencyContact: 'Juan (Pareja) - 600 000 000',
      referralSource: 'Recomendación',
      clinicalNotes: [
        {
          id: 'n1',
          date: '2023-10-01T10:00:00.000Z',
          title: 'Sesión Inicial de Evaluación',
          content: 'Sesión inicial. La paciente describe síntomas de ansiedad relacionados con la entrega de proyectos. Duerme mal (4-5 horas). Se establecen objetivos de higiene del sueño.'
        },
        {
          id: 'n2',
          date: '2023-10-15T10:00:00.000Z',
          title: 'Seguimiento - Pautas de Sueño',
          content: 'Seguimiento. Reporta ligera mejoría en el sueño tras aplicar pautas. Mantiene rumiación nocturna sobre temas laborales. Trabajamos reestructuración cognitiva básica.'
        }
      ]
    },
    { 
      id: '2', 
      name: 'Carlos Ruiz', 
      email: 'carlos.r@email.com', 
      phone: '600 987 654', 
      age: 35, 
      startDate: '2023-11-15', 
      active: true,
      notes: 'Proceso de duelo reciente.',
      occupation: 'Profesor',
      address: 'Av. Libertad 42, Madrid',
      emergencyContact: 'Maria (Madre) - 611 111 111',
      referralSource: 'Internet',
      clinicalNotes: []
    }
  ]);

  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: '101', patientId: '1', date: new Date().toISOString(), durationMinutes: 60, type: 'Seguimiento' as any, status: 'scheduled' }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 't1', date: '2023-10-05', description: 'Consulta Ana G.', amount: 60, type: 'income', category: 'Consulta' },
    { id: 't2', date: '2023-10-10', description: 'Alquiler despacho', amount: 400, type: 'expense', category: 'Infraestructura' }
  ]);

  const handleUpdatePatient = (updatedPatient: Patient) => {
    setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  };

  const handleDeletePatient = (patientId: string) => {
    setPatients(patients.filter(p => p.id !== patientId));
    // Optionally remove appointments for this patient to keep data consistent
    setAppointments(appointments.filter(a => a.patientId !== patientId));
  };

  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab(Tab.DASHBOARD);
    localStorage.removeItem('psico_user');
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.DASHBOARD:
        return <Dashboard 
          patients={patients} 
          appointments={appointments} 
          transactions={transactions} 
          onNavigate={setActiveTab}
        />;
      case Tab.PATIENTS:
        return <PatientsView 
          patients={patients} 
          appointments={appointments} 
          onAddPatient={(p) => setPatients([...patients, p])}
          onUpdatePatient={handleUpdatePatient}
          onDeletePatient={handleDeletePatient}
          onUpdateAppointment={(a) => setAppointments(appointments.map(ap => ap.id === a.id ? a : ap))} 
        />;
      case Tab.CALENDAR:
        return <CalendarView 
          appointments={appointments} 
          patients={patients}
          onAddAppointment={(a) => setAppointments([...appointments, a])}
          onUpdateStatus={(id, status) => setAppointments(appointments.map(a => a.id === id ? {...a, status} : a))}
        />;
      case Tab.FINANCE:
        return <FinanceView 
          transactions={transactions}
          onAddTransaction={(t) => setTransactions([...transactions, t])}
          onUpdateTransaction={handleUpdateTransaction}
        />;
      default:
        return <Dashboard patients={patients} appointments={appointments} transactions={transactions} onNavigate={setActiveTab} />;
    }
  };

  const NavButton = ({ tab, icon: Icon, label }: { tab: Tab, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col md:flex-row items-center justify-center md:justify-start space-y-1 md:space-y-0 md:space-x-3 px-2 md:px-4 py-2 md:py-3 rounded-lg transition-all w-full ${
        activeTab === tab 
        ? 'bg-transparent md:bg-teal-50 text-teal-600 md:text-teal-700 font-medium' 
        : 'text-slate-400 md:text-slate-500 hover:text-slate-600 md:hover:bg-slate-50'
      }`}
    >
      <Icon size={24} strokeWidth={activeTab === tab ? 2.5 : 2} className="md:w-5 md:h-5" />
      <span className="text-[10px] md:text-base">{label}</span>
    </button>
  );

  // If no user is logged in, show the login view
  if (!user) {
    return <LoginView onLogin={(u) => setUser(u)} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans overflow-hidden animate-fade-in">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between gap-2 flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
            <div className="bg-teal-600 p-1.5 rounded-lg">
                <Activity className="text-white" size={18} />
            </div>
            <span className="text-lg font-bold text-slate-800 tracking-tight">PsicoGestión AI</span>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
            <LogOut size={20} />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shadow-sm z-10 h-full justify-between">
        <div>
            <div className="p-6 flex items-center space-x-2 border-b border-slate-100 flex-shrink-0 mb-2">
            <div className="bg-teal-600 p-2 rounded-lg">
                <Activity className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">PsicoGestión AI</span>
            </div>
            
            <div className="py-2 space-y-1 px-3 overflow-y-auto">
                <NavButton tab={Tab.DASHBOARD} icon={LayoutDashboard} label="Resumen" />
                <NavButton tab={Tab.PATIENTS} icon={Users} label="Pacientes" />
                <NavButton tab={Tab.CALENDAR} icon={Calendar} label="Agenda" />
                <NavButton tab={Tab.FINANCE} icon={PiggyBank} label="Finanzas" />
            </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200 overflow-hidden">
                    {user?.picture ? (
                        <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        user?.name?.charAt(0) || 'D'
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{user?.name || 'Doctor'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email || 'email@psicogestion.ai'}</p>
                </div>
            </div>
            
            <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-rose-600 hover:bg-rose-50 py-2 rounded-lg transition-colors w-full"
            >
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </nav>

      {/* Main Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col h-full pb-[60px] md:pb-0">
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-30 pb-safe">
         <NavButton tab={Tab.DASHBOARD} icon={LayoutDashboard} label="Inicio" />
         <NavButton tab={Tab.PATIENTS} icon={Users} label="Pacientes" />
         <NavButton tab={Tab.CALENDAR} icon={Calendar} label="Agenda" />
         <NavButton tab={Tab.FINANCE} icon={PiggyBank} label="Finanzas" />
      </div>
    </div>
  );
};

export default App;