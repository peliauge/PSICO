import React, { useState } from 'react';
import { Activity, ShieldCheck, Zap, Globe, User } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLogin: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  // Simulated Login Logic (No Firebase)
  const handleLogin = (type: 'google' | 'demo') => {
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
        const userProfile: UserProfile = {
            name: type === 'google' ? "Usuario Google Simulado" : "Usuario Demo",
            email: "usuario@psicogestion.ai",
            picture: "", // Will use default initial avatar
            sub: "user-123"
        };
        onLogin(userProfile);
        setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
            <div className="bg-teal-600 p-3 rounded-xl shadow-lg shadow-teal-600/20">
                 <Activity className="text-white h-10 w-10" />
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          PsicoGestión AI
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Tu consulta, potenciada por inteligencia artificial
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/60 rounded-2xl sm:px-10 border border-slate-100">
          <div className="space-y-6">
            <div>
               <h3 className="text-lg font-medium text-slate-800 text-center mb-6">Bienvenido</h3>
               
               {/* Simulated Google Login Button */}
               <button
                  onClick={() => handleLogin('google')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 border border-slate-300 py-3 rounded-lg hover:bg-slate-50 transition-all shadow-sm font-medium text-sm relative overflow-hidden group"
               >
                   {loading ? (
                       <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
                   ) : (
                       <>
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        <span>Continuar con Google (Simulado)</span>
                       </>
                   )}
               </button>
               
               {/* Divider */}
               <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-slate-400">O continúa como invitado</span>
                  </div>
                </div>

               <button 
                  onClick={() => handleLogin('demo')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-2.5 rounded-full hover:bg-slate-900 transition-colors shadow-sm font-medium text-sm"
               >
                  <User size={18} />
                  Acceso Demo
               </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center pt-2">
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50">
                    <ShieldCheck className="text-teal-600 h-5 w-5" />
                    <span className="text-[10px] text-slate-500 font-medium">Privado</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50">
                    <Zap className="text-amber-500 h-5 w-5" />
                    <span className="text-[10px] text-slate-500 font-medium">Rápido</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50">
                    <Globe className="text-indigo-500 h-5 w-5" />
                    <span className="text-[10px] text-slate-500 font-medium">Local</span>
                </div>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-400">
           &copy; 2024 PsicoGestión AI. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};