import React, { useState, useEffect, useRef } from 'react';
import { Patient, Appointment, ClinicalNote, Attachment } from '../types';
import { Search, Plus, FileText, Phone, Mail, Wand2, Users, Edit, MapPin, Briefcase, HeartPulse, User, X, Save, History, Calendar, Edit2, CheckCircle, Sparkles, ChevronDown, ChevronUp, Mic, MicOff, Filter, Eye, Download, ArrowLeft, Trash2 } from 'lucide-react';
import { generateClinicalNote } from '../services/geminiService';

interface PatientsViewProps {
  patients: Patient[];
  appointments: Appointment[];
  onAddPatient: (p: Patient) => void;
  onUpdatePatient: (p: Patient) => void;
  onDeletePatient: (id: string) => void;
  onUpdateAppointment: (a: Appointment) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({ patients, appointments, onAddPatient, onUpdatePatient, onDeletePatient, onUpdateAppointment }) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({});

  // Note taking state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedNote, setGeneratedNote] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Note Editing State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [editingNoteTitle, setEditingNoteTitle] = useState('');
  
  // Accordion State
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Document Viewer State
  const [viewingDoc, setViewingDoc] = useState<Attachment | null>(null);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : 
                          statusFilter === 'active' ? p.active : !p.active;
    return matchesSearch && matchesStatus;
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const patientAppointments = appointments.filter(a => a.patientId === selectedPatientId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Helper to determine visibility on mobile
  const showList = !selectedPatientId && !isFormOpen;
  const showDetail = selectedPatientId || isFormOpen;

  // Reset form when selecting a patient or closing form
  useEffect(() => {
    if (!isFormOpen) {
      setFormData({});
      setNoteTitle('');
      setNoteInput('');
      setGeneratedNote('');
      setEditingNoteId(null);
      setIsReviewModalOpen(false);
      setExpandedNoteId(null);
      setViewingDoc(null);
      if (isListening) stopListening();
    }
  }, [isFormOpen, selectedPatientId]);

  // Cleanup voice recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta el reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setNoteInput(prev => {
            const spacing = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + spacing + finalTranscript;
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleAddNew = () => {
    setFormData({ active: true }); // Default active
    setIsFormOpen(true);
    setSelectedPatientId(null); // Deselect to show form fully
  };

  const handleEdit = (patient: Patient) => {
    setFormData({ ...patient });
    setIsFormOpen(true);
  };

  const handleDelete = (patient: Patient) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${patient.name}? Esta acción eliminará su ficha y sus citas.`)) {
      onDeletePatient(patient.id);
      setSelectedPatientId(null);
    }
  };

  const handleBackToList = () => {
    setSelectedPatientId(null);
    setIsFormOpen(false);
  };

  const handleSavePatient = () => {
    if (formData.name && formData.email) {
      const patientToSave: Patient = {
        id: formData.id || Date.now().toString(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        age: formData.age || 0,
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        active: formData.active !== undefined ? formData.active : true,
        notes: formData.notes || '',
        occupation: formData.occupation || '',
        address: formData.address || '',
        emergencyContact: formData.emergencyContact || '',
        referralSource: formData.referralSource || '',
        attachments: formData.attachments || [],
        clinicalNotes: formData.clinicalNotes || []
      };

      if (formData.id) {
        onUpdatePatient(patientToSave);
      } else {
        onAddPatient(patientToSave);
      }
      
      setIsFormOpen(false);
      setSelectedPatientId(patientToSave.id);
    }
  };

  const handleGenerateNote = async () => {
    if (!noteInput) return;
    setAiLoading(true);
    const result = await generateClinicalNote(noteInput);
    setGeneratedNote(result);
    setAiLoading(false);
    setIsReviewModalOpen(true); // Open review modal immediately after generation
  };

  const handleSaveClinicalNote = () => {
    const contentToSave = generatedNote || noteInput;
    if (selectedPatient && contentToSave) {
        const newNote: ClinicalNote = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            title: noteTitle || 'Sesión sin título',
            content: contentToSave
        };
        
        const updatedPatient = {
            ...selectedPatient,
            clinicalNotes: [newNote, ...(selectedPatient.clinicalNotes || [])]
        };
        
        onUpdatePatient(updatedPatient);
        
        // Reset input fields
        setNoteTitle('');
        setNoteInput('');
        setGeneratedNote('');
        setIsReviewModalOpen(false);
    }
  };

  const handleStartEditNote = (note: ClinicalNote) => {
    setEditingNoteId(note.id);
    setEditingNoteTitle(note.title || '');
    setEditingNoteContent(note.content);
    setExpandedNoteId(note.id); // Ensure it's expanded when editing
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
    setEditingNoteTitle('');
  };

  const handleUpdateNote = () => {
    if (!selectedPatient || !editingNoteId) return;

    const updatedNotes = selectedPatient.clinicalNotes?.map(note => 
      note.id === editingNoteId 
        ? { ...note, content: editingNoteContent, title: editingNoteTitle } 
        : note
    );

    onUpdatePatient({
        ...selectedPatient,
        clinicalNotes: updatedNotes
    });

    setEditingNoteId(null);
    setEditingNoteContent('');
    setEditingNoteTitle('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedPatient) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
            const newAttachment: Attachment = {
                id: Date.now().toString(),
                name: file.name,
                type: file.type,
                data: event.target.result as string,
                uploadDate: new Date().toISOString()
            };

            const updatedAttachments = [...(selectedPatient.attachments || []), newAttachment];
            onUpdatePatient({
                ...selectedPatient,
                attachments: updatedAttachments
            });
        }
      };
      
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteAttachment = (id: string) => {
    if (selectedPatient && selectedPatient.attachments) {
        const updatedAttachments = selectedPatient.attachments.filter(f => f.id !== id);
        onUpdatePatient({
            ...selectedPatient,
            attachments: updatedAttachments
        });
    }
  };

  const toggleExpandNote = (noteId: string) => {
    if (editingNoteId === noteId) return; // Prevent toggling if editing
    setExpandedNoteId(expandedNoteId === noteId ? null : noteId);
  }

  return (
    <div className="flex h-full md:h-[calc(100vh-4rem)]">
      {/* Sidebar List - Hidden on mobile if details selected */}
      <div className={`${showList ? 'flex' : 'hidden md:flex'} w-full md:w-1/3 border-r border-slate-200 bg-white flex-col`}>
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg text-slate-800">Pacientes</h2>
            <button 
              onClick={handleAddNew}
              className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
              <Plus size={20} />
            </button>
          </div>
          
          {/* Search & Filter */}
          <div className="space-y-2">
             <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                type="text" 
                placeholder="Buscar paciente..." 
                className="w-full pl-10 pr-4 py-2 bg-white text-black border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex p-1 bg-slate-100 rounded-lg">
                <button 
                    onClick={() => setStatusFilter('all')}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Todos
                </button>
                <button 
                    onClick={() => setStatusFilter('active')}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${statusFilter === 'active' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Activos
                </button>
                <button 
                    onClick={() => setStatusFilter('inactive')}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${statusFilter === 'inactive' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Inactivos
                </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {filteredPatients.length === 0 ? (
             <div className="p-8 text-center text-slate-400 text-sm">
                 No se encontraron pacientes.
             </div>
          ) : (
              filteredPatients.map(patient => (
                <div 
                  key={patient.id}
                  onClick={() => { setIsFormOpen(false); setSelectedPatientId(patient.id); }}
                  className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group ${selectedPatientId === patient.id ? 'bg-teal-50 border-l-4 border-l-teal-600' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full ${patient.active ? 'bg-emerald-400' : 'bg-slate-300'}`} title={patient.active ? 'Activo' : 'Inactivo'}></div>
                       <div>
                          <h3 className={`font-medium ${selectedPatientId === patient.id ? 'text-teal-900' : 'text-slate-900'} ${!patient.active ? 'opacity-60' : ''}`}>{patient.name}</h3>
                          <p className="text-sm text-slate-500 truncate">{patient.email}</p>
                       </div>
                    </div>
                    {selectedPatientId === patient.id && (
                       <button onClick={(e) => { e.stopPropagation(); handleEdit(patient); }} className="text-slate-400 hover:text-teal-600 p-1">
                          <Edit size={16} />
                       </button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Main Content - Hidden on mobile if list selected */}
      <div className={`${showDetail ? 'flex' : 'hidden md:flex'} w-full md:flex-1 bg-slate-50 p-4 md:p-6 overflow-y-auto relative flex-col`}>
        {/* Mobile Back Button */}
        {(isFormOpen || selectedPatientId) && (
             <div className="md:hidden mb-4 flex items-center">
                 <button 
                    onClick={handleBackToList}
                    className="flex items-center gap-2 text-slate-600 font-medium hover:text-teal-600 p-2 -ml-2"
                 >
                     <ArrowLeft size={20} /> Volver a la lista
                 </button>
             </div>
        )}

        {isFormOpen ? (
          <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm max-w-3xl mx-auto animate-fade-in border border-slate-100 w-full">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {formData.id ? 'Editar Paciente' : 'Nuevo Paciente'}
              </h3>
              
              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                 <span className={`text-xs md:text-sm font-medium ${formData.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {formData.active ? 'Activo' : 'Inactivo'}
                 </span>
                 <button 
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${formData.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                 >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${formData.active ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User size={16}/> Información Personal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                    <input 
                      className="w-full p-2.5 bg-white text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" 
                      placeholder="Ej. Ana García"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Edad</label>
                    <input 
                      className="w-full p-2.5 bg-white text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" 
                      type="number"
                      placeholder="Ej. 30"
                      value={formData.age || ''}
                      onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ocupación</label>
                    <input 
                      className="w-full p-2.5 bg-white text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" 
                      placeholder="Ej. Arquitecta"
                      value={formData.occupation || ''}
                      onChange={e => setFormData({...formData, occupation: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 mt-2 flex items-center gap-2">
                  <Phone size={16}/> Contacto
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      className="w-full p-2.5 bg-white text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" 
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={formData.email || ''}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                    <input 
                      className="w-full p-2.5 bg-white text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" 
                      placeholder="+34 600 000 000"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                    <input 
                      className="w-full p-2.5 bg-white text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" 
                      placeholder="Calle, Número, Ciudad"
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Extra Info */}
              <div>
                 <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 mt-2 flex items-center gap-2">
                  <HeartPulse size={16}/> Datos Adicionales
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contacto Emergencia</label>
                    <input 
                      className="w-full p-2.5 bg-white text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" 
                      placeholder="Nombre y Teléfono"
                      value={formData.emergencyContact || ''}
                      onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fuente de Referencia</label>
                    <input 
                      className="w-full p-2.5 bg-white text-black border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" 
                      placeholder="Ej. Recomendación, Internet"
                      value={formData.referralSource || ''}
                      onChange={e => setFormData({...formData, referralSource: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
              <button onClick={() => setIsFormOpen(false)} className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancelar</button>
              <button onClick={handleSavePatient} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm font-medium">
                {formData.id ? 'Guardar Cambios' : 'Crear Paciente'}
              </button>
            </div>
          </div>
        ) : selectedPatient ? (
          <div className="space-y-6 animate-fade-in">
            {/* Header Info Card */}
            <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 md:p-6 flex gap-2">
                 <button 
                  onClick={() => handleEdit(selectedPatient)}
                  className="flex items-center gap-2 text-slate-400 hover:text-teal-600 transition-colors border border-slate-200 rounded-lg px-3 py-1.5 text-sm hover:border-teal-600 bg-white"
                 >
                   <Edit size={16} /> <span className="hidden md:inline">Editar</span>
                 </button>
                 <button 
                  onClick={() => handleDelete(selectedPatient)}
                  className="flex items-center gap-2 text-rose-400 hover:text-rose-600 transition-colors border border-slate-200 rounded-lg px-3 py-1.5 text-sm hover:border-rose-400 hover:bg-rose-50 bg-white"
                  title="Eliminar paciente"
                 >
                   <Trash2 size={16} /> <span className="hidden md:inline">Eliminar</span>
                 </button>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-6">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold border-4 border-white shadow-sm ${selectedPatient.active ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <h2 className={`text-2xl md:text-3xl font-bold ${selectedPatient.active ? 'text-slate-800' : 'text-slate-500'}`}>{selectedPatient.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                     {selectedPatient.active ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Activo
                        </span>
                     ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Inactivo
                        </span>
                     )}
                    <span className="text-slate-300">•</span>
                    <span className="text-sm text-slate-500">Iniciado: {new Date(selectedPatient.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8 mt-8 border-t border-slate-50 pt-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Mail size={14}/> Email</p>
                  <p className="text-slate-700 font-medium break-all">{selectedPatient.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Phone size={14}/> Teléfono</p>
                  <p className="text-slate-700 font-medium">{selectedPatient.phone}</p>
                </div>
                 <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><User size={14}/> Edad</p>
                  <p className="text-slate-700 font-medium">{selectedPatient.age} años</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Briefcase size={14}/> Ocupación</p>
                  <p className="text-slate-700 font-medium">{selectedPatient.occupation || 'No registrada'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><MapPin size={14}/> Dirección</p>
                  <p className="text-slate-700 font-medium truncate" title={selectedPatient.address}>{selectedPatient.address || 'No registrada'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><HeartPulse size={14}/> Emergencia</p>
                  <p className="text-slate-700 font-medium">{selectedPatient.emergencyContact || 'No registrado'}</p>
                </div>
              </div>
            </div>

            {/* Quick AI Notes */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText size={18} /> Asistente de Notas (IA)
                </h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200">Gemini 2.5 Flash</span>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                     <label className="block text-xs font-medium text-slate-500">Borrador / Notas Rápidas</label>
                     <button 
                        onClick={toggleMic}
                        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all ${isListening ? 'bg-rose-100 text-rose-600 border-rose-200 animate-pulse' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        title={isListening ? "Detener dictado" : "Iniciar dictado por voz"}
                     >
                        {isListening ? <MicOff size={14}/> : <Mic size={14}/>}
                        {isListening ? 'Escuchando...' : 'Dictar'}
                     </button>
                  </div>
                  
                  <input 
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2 bg-white text-black placeholder:text-slate-400"
                    placeholder="Título de la sesión..."
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                  />
                  <div className="relative">
                    <textarea 
                        className={`w-full h-40 p-3 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all bg-white text-black ${isListening ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200 focus:ring-indigo-500'}`}
                        placeholder="Escribe o dicta aquí tus notas desordenadas..."
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                    />
                    {isListening && (
                        <span className="absolute bottom-3 right-3 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 mt-3 justify-between items-center">
                    <p className="text-xs text-slate-400 hidden md:block">La IA estructurará estas notas en formato SOAP.</p>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleGenerateNote}
                            disabled={aiLoading || !noteInput}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium shadow-sm"
                        >
                            {aiLoading ? 'Generando...' : <><Wand2 size={16}/> Organizar con IA</>}
                        </button>
                        {/* Direct save for manual notes */}
                        <button 
                            onClick={handleSaveClinicalNote}
                            disabled={!noteInput && !generatedNote}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-300 disabled:opacity-50 transition-all font-medium shadow-sm"
                            title="Guardar sin usar IA"
                        >
                           Guardar Directo
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical History Section */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
               <div className="flex items-center gap-2 mb-4">
                  <History size={18} className="text-slate-600"/>
                  <h3 className="font-semibold text-slate-800">Historial Clínico</h3>
               </div>

               {selectedPatient.clinicalNotes && selectedPatient.clinicalNotes.length > 0 ? (
                   <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                       {selectedPatient.clinicalNotes.map((note) => (
                           <div key={note.id} className={`border rounded-lg overflow-hidden transition-all ${expandedNoteId === note.id || editingNoteId === note.id ? 'shadow-md border-teal-200' : 'border-slate-200 hover:border-teal-200'}`}>
                               
                               {/* Header - Always Visible */}
                               <div 
                                  className={`p-4 flex items-center justify-between cursor-pointer bg-white ${expandedNoteId === note.id ? 'border-b border-slate-100' : ''}`}
                                  onClick={() => toggleExpandNote(note.id)}
                               >
                                  <div className="flex items-center gap-4">
                                      <div className="flex flex-col min-w-[90px] md:min-w-[100px]">
                                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(note.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                                         </span>
                                         <span className="text-xs text-slate-400 mt-0.5">
                                            {new Date(note.date).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                                         </span>
                                      </div>
                                      <div className="hidden md:block w-px h-8 bg-slate-100"></div>
                                      <h4 className="font-semibold text-slate-800 text-sm truncate md:overflow-visible">{note.title || 'Sesión sin título'}</h4>
                                  </div>

                                  <div className="flex items-center gap-2">
                                      {/* Edit button always accessible, stops propagation of expand click */}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleStartEditNote(note); }}
                                        className={`p-1.5 rounded-full transition-colors ${editingNoteId === note.id ? 'bg-teal-100 text-teal-700' : 'text-slate-300 hover:text-teal-600 hover:bg-slate-100'}`}
                                        title="Editar nota"
                                      >
                                          <Edit2 size={16} />
                                      </button>
                                      <div className={`text-slate-400 transition-transform duration-200 ${expandedNoteId === note.id ? 'rotate-180' : ''}`}>
                                         <ChevronDown size={20} />
                                      </div>
                                  </div>
                               </div>
                               
                               {/* Expandable Content */}
                               {(expandedNoteId === note.id || editingNoteId === note.id) && (
                                 <div className="p-5 bg-slate-50 animate-fade-in border-t border-slate-100">
                                   {editingNoteId === note.id ? (
                                     <div className="animate-fade-in">
                                       <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Título de la sesión</label>
                                       <input 
                                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none mb-3 bg-white text-black"
                                          value={editingNoteTitle}
                                          onChange={(e) => setEditingNoteTitle(e.target.value)}
                                          placeholder="Título..."
                                       />
                                       <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Contenido</label>
                                       <textarea 
                                          className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none resize-y min-h-[150px] mb-3 bg-white text-black"
                                          value={editingNoteContent}
                                          onChange={(e) => setEditingNoteContent(e.target.value)}
                                       />
                                       <div className="flex justify-end gap-2">
                                          <button 
                                            onClick={handleCancelEditNote}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
                                          >
                                            Cancelar
                                          </button>
                                          <button 
                                            onClick={handleUpdateNote}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                                          >
                                            <CheckCircle size={14}/> Guardar Cambios
                                          </button>
                                       </div>
                                     </div>
                                   ) : (
                                      <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                                          {note.content}
                                      </div>
                                   )}
                                 </div>
                               )}
                           </div>
                       ))}
                   </div>
               ) : (
                   <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                       <div className="inline-flex p-3 bg-slate-100 rounded-full text-slate-300 mb-3">
                           <FileText size={24} />
                       </div>
                       <p className="text-slate-500 font-medium text-sm">No hay notas clínicas registradas.</p>
                       <p className="text-slate-400 text-xs mt-1">Utiliza el asistente superior para generar y guardar notas.</p>
                   </div>
               )}
            </div>

            {/* Appointment History */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4">Historial de Citas</h3>
              {patientAppointments.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                  <p className="text-slate-400 text-sm">No hay citas registradas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patientAppointments.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-teal-300 transition-colors group">
                      <div>
                        <span className="font-semibold text-slate-700">{new Date(apt.date).toLocaleDateString()}</span>
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-sm text-slate-500">{apt.type}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${apt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {apt.status === 'completed' ? 'Completada' : 'Programada'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

             {/* Documents */}
             <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4">Documentos Adjuntos</h3>
              
              {/* Existing Files */}
              {selectedPatient.attachments && selectedPatient.attachments.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 mb-4">
                      {selectedPatient.attachments.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:border-teal-300 transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="bg-white p-2 rounded border border-slate-200 text-teal-600">
                                      <FileText size={16} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-700 truncate max-w-[150px] md:max-w-[200px]">{file.name}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(file.uploadDate).toLocaleDateString()}</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setViewingDoc(file)}
                                    className="text-slate-400 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50 transition-colors"
                                    title="Ver documento"
                                >
                                    <Eye size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteAttachment(file.id)}
                                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded hover:bg-rose-50 transition-colors"
                                    title="Eliminar archivo"
                                >
                                    <X size={18} />
                                </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-teal-400 transition-all cursor-pointer relative group">
                <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={handleFileUpload}
                    accept="image/*,application/pdf"
                />
                <div className="text-slate-400 group-hover:text-teal-600 transition-colors">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Haga clic o arrastre archivos aquí</p>
                  <p className="text-xs opacity-70 mt-1">PDF, JPG, PNG</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
              <Users size={48} />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">Gestión de Pacientes</h3>
            <p className="max-w-xs text-center text-slate-400">Selecciona un paciente de la lista para ver su expediente completo o añade uno nuevo.</p>
          </div>
        )}
        
        {/* Review/Edit Generated Note Modal */}
        {isReviewModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100">
                         <div className="flex items-center gap-3">
                             <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                 <Sparkles size={20} />
                             </div>
                             <div>
                                 <h3 className="font-bold text-lg text-slate-800">Revisar Nota Estructurada</h3>
                                 <p className="text-xs text-slate-500">Generada por IA • Puedes editar antes de guardar</p>
                             </div>
                         </div>
                         <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                             <X size={24} />
                         </button>
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Título de la Sesión</label>
                        <input 
                          className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4 bg-white text-black"
                          placeholder="Ej. Sesión de seguimiento..."
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                        />
                        <label className="block text-sm font-medium text-slate-700 mb-2">Contenido (SOAP)</label>
                        <textarea 
                            className="w-full h-[300px] p-4 bg-white text-black border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none shadow-inner"
                            value={generatedNote}
                            onChange={(e) => setGeneratedNote(e.target.value)}
                            placeholder="El contenido generado aparecerá aquí..."
                        />
                    </div>
                    
                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                         <button 
                            onClick={() => setIsReviewModalOpen(false)}
                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                         >
                             Descartar
                         </button>
                         <button 
                            onClick={handleSaveClinicalNote}
                            className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
                         >
                             <Save size={18} /> Confirmar y Guardar
                         </button>
                    </div>
                </div>
            </div>
        )}

        {/* Document Viewer Modal */}
        {viewingDoc && (
            <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex flex-col p-4 animate-fade-in">
                <div className="flex justify-between items-center mb-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded">
                            <FileText size={20} />
                        </div>
                        <div>
                             <h3 className="text-lg font-medium">{viewingDoc.name}</h3>
                             <p className="text-xs opacity-70">Subido el {new Date(viewingDoc.uploadDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
                </div>
                
                <div className="flex-1 flex items-center justify-center overflow-hidden relative bg-slate-900 rounded-lg border border-slate-800">
                     {viewingDoc.type.startsWith('image/') ? (
                         <img src={viewingDoc.data} alt={viewingDoc.name} className="max-w-full max-h-full object-contain" />
                     ) : viewingDoc.type === 'application/pdf' ? (
                         <iframe src={viewingDoc.data} title={viewingDoc.name} className="w-full h-full" />
                     ) : (
                         <div className="text-center text-white">
                            <FileText size={64} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg mb-2">Vista previa no disponible para este formato.</p>
                            <p className="text-sm opacity-60 mb-6">Tipo de archivo: {viewingDoc.type}</p>
                            <a 
                                href={viewingDoc.data} 
                                download={viewingDoc.name} 
                                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                <Download size={20} /> Descargar Archivo
                            </a>
                         </div>
                     )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};