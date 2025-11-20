import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PaintBucket, 
  Hammer, 
  MessageSquare, 
  Plus, 
  Trash2, 
  ChevronRight, 
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Send
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Project, Material, Payment, ProjectStatus, ChatMessage } from './types';
import { askAssistant } from './services/geminiService';
import { Card } from './components/Card';
import { Modal } from './components/Modal';
import { ImageSimulator } from './components/ImageSimulator';
import { LiveAssistant } from './components/LiveAssistant';

// --- MAIN APP COMPONENT ---

export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'assistant'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Project Management State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    status: ProjectStatus.PENDING
  });

  // Detail View State
  const [detailView, setDetailView] = useState<string | null>(null); // Project ID

  // Material/Payment Modal State
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', cost: '', quantity: '1' });
  const [newPayment, setNewPayment] = useState({ amount: '', note: '' });

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: 'Olá Bill! Como posso ajudar nas suas obras hoje?', timestamp: Date.now() }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- EFFECTS ---
  // Load data from local storage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('bill_projects');
    const savedMaterials = localStorage.getItem('bill_materials');
    const savedPayments = localStorage.getItem('bill_payments');

    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedMaterials) setMaterials(JSON.parse(savedMaterials));
    if (savedPayments) setPayments(JSON.parse(savedPayments));
  }, []);

  // Save data to local storage on change
  useEffect(() => {
    localStorage.setItem('bill_projects', JSON.stringify(projects));
    localStorage.setItem('bill_materials', JSON.stringify(materials));
    localStorage.setItem('bill_payments', JSON.stringify(payments));
  }, [projects, materials, payments]);

  // --- HELPERS ---

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getProjectFinancials = (projectId: string) => {
    const projectMats = materials.filter(m => m.projectId === projectId);
    const projectPays = payments.filter(p => p.projectId === projectId);
    
    const totalMaterialsCost = projectMats.reduce((sum, m) => sum + (m.cost * m.quantity), 0);
    const totalPaid = projectPays.reduce((sum, p) => sum + p.amount, 0);
    
    return { totalMaterialsCost, totalPaid };
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETED: return 'text-green-600 bg-green-100';
      case ProjectStatus.IN_PROGRESS: return 'text-blue-600 bg-blue-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  // --- ACTIONS ---

  const handleAddProject = () => {
    if (!newProject.title || !newProject.clientName) return;
    
    const project: Project = {
      id: crypto.randomUUID(),
      title: newProject.title!,
      clientName: newProject.clientName!,
      description: newProject.description || '',
      status: ProjectStatus.PENDING,
      totalAgreedPrice: Number(newProject.totalAgreedPrice) || 0,
      startDate: new Date().toISOString().split('T')[0],
    };

    setProjects(prev => [project, ...prev]);
    setNewProject({ status: ProjectStatus.PENDING });
    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Tem certeza que quer excluir esta obra?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setMaterials(prev => prev.filter(m => m.projectId !== id));
      setPayments(prev => prev.filter(p => p.projectId !== id));
      if (detailView === id) setDetailView(null);
    }
  };

  const handleAddMaterial = () => {
    if (!detailView || !newItem.name || !newItem.cost) return;
    
    const material: Material = {
      id: crypto.randomUUID(),
      projectId: detailView,
      name: newItem.name,
      cost: Number(newItem.cost),
      quantity: Number(newItem.quantity),
      date: new Date().toISOString()
    };

    setMaterials(prev => [...prev, material]);
    setNewItem({ name: '', cost: '', quantity: '1' });
    setIsMaterialModalOpen(false);
  };

  const handleAddPayment = () => {
    if (!detailView || !newPayment.amount) return;

    const payment: Payment = {
      id: crypto.randomUUID(),
      projectId: detailView,
      amount: Number(newPayment.amount),
      note: newPayment.note,
      date: new Date().toISOString()
    };

    setPayments(prev => [...prev, payment]);
    setNewPayment({ amount: '', note: '' });
    setIsPaymentModalOpen(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: chatInput,
      timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    // Prepare context for AI
    const context = JSON.stringify({
      projects: projects.map(p => ({
        title: p.title,
        status: p.status,
        financials: getProjectFinancials(p.id)
      })),
    });

    const responseText = await askAssistant(userMsg.text, context);

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, aiMsg]);
    setIsChatLoading(false);
  };

  // --- VIEWS ---

  const renderDashboard = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length;
    
    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = materials.reduce((sum, m) => sum + (m.cost * m.quantity), 0);
    const profit = totalIncome - totalExpenses;

    const chartData = [
      { name: 'Recebido', value: totalIncome, color: '#22c55e' },
      { name: 'Gasto', value: totalExpenses, color: '#ef4444' },
    ];

    return (
      <div className="space-y-6 pb-24">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Painel do Bill</h1>
          <p className="text-slate-500">Bem-vindo de volta ao trabalho!</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <PaintBucket size={24} className="text-white" />
              </div>
              <div>
                <p className="text-blue-100 text-sm">Obras Ativas</p>
                <h3 className="text-2xl font-bold">{activeProjects} de {totalProjects}</h3>
              </div>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm">Lucro Líquido</p>
                <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(profit)}</h3>
              </div>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Hammer size={24} className="text-orange-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm">Gasto em Material</p>
                <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalExpenses)}</h3>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Balanço Geral">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const renderProjectList = () => (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900">Minhas Obras</h2>
        <button 
          onClick={() => setIsProjectModalOpen(true)}
          className="bg-secondary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-medium shadow-md transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Nova Obra</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <PaintBucket size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nenhuma obra cadastrada.</p>
          <p className="text-sm text-slate-400">Clique em "Nova Obra" para começar.</p>
        </div>
      ) : (
        projects.map(project => {
          const { totalMaterialsCost, totalPaid } = getProjectFinancials(project.id);
          const percentPaid = project.totalAgreedPrice > 0 ? (totalPaid / project.totalAgreedPrice) * 100 : 0;

          return (
            <div 
              key={project.id} 
              onClick={() => setDetailView(project.id)}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{project.title}</h3>
                  <div className="flex items-center text-slate-500 text-sm">
                    <User size={14} className="mr-1" />
                    {project.clientName}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Valor Combinado:</span>
                  <span className="font-medium">{formatCurrency(project.totalAgreedPrice)}</span>
                </div>
                
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.min(percentPaid, 100)}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Recebido: {formatCurrency(totalPaid)}</span>
                  <span>Gasto: {formatCurrency(totalMaterialsCost)}</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderProjectDetail = () => {
    const project = projects.find(p => p.id === detailView);
    if (!project) return null;

    const projectMats = materials.filter(m => m.projectId === project.id);
    const projectPays = payments.filter(p => p.projectId === project.id);

    return (
      <div className="pb-24 animate-in slide-in-from-right duration-300">
        <button 
          onClick={() => setDetailView(null)}
          className="mb-4 text-slate-500 flex items-center hover:text-slate-800"
        >
          <ChevronRight size={20} className="rotate-180 mr-1" /> Voltar
        </button>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
              <p className="text-slate-500">{project.clientName}</p>
            </div>
            <button onClick={() => handleDeleteProject(project.id)} className="text-red-500 p-2">
              <Trash2 size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-slate-50 p-3 rounded-lg">
              <span className="text-xs text-slate-500 uppercase font-bold">Valor Total</span>
              <div className="text-lg font-semibold text-slate-800">{formatCurrency(project.totalAgreedPrice)}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
               <span className="text-xs text-slate-500 uppercase font-bold">Status</span>
               <select 
                 value={project.status}
                 onChange={(e) => {
                    const updated = { ...project, status: e.target.value as ProjectStatus };
                    setProjects(prev => prev.map(p => p.id === project.id ? updated : p));
                 }}
                 className="block w-full mt-1 bg-white border-slate-300 text-sm rounded-md shadow-sm focus:border-secondary focus:ring focus:ring-secondary focus:ring-opacity-50"
               >
                 {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
          </div>
        </div>

        {/* New Image Simulator Feature */}
        <div className="mb-6">
          <ImageSimulator />
        </div>

        {/* Materials Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 flex items-center"><Hammer size={18} className="mr-2"/> Materiais</h3>
            <button onClick={() => setIsMaterialModalOpen(true)} className="text-sm text-secondary font-medium">+ Adicionar</button>
          </div>
          <div className="space-y-2">
            {projectMats.map(m => (
              <div key={m.id} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.quantity}x - {new Date(m.date).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="font-bold text-red-500">
                  - {formatCurrency(m.cost * m.quantity)}
                </div>
              </div>
            ))}
            {projectMats.length === 0 && <div className="text-center text-slate-400 text-sm py-4">Nenhum material registrado.</div>}
          </div>
        </div>

        {/* Payments Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 flex items-center"><DollarSign size={18} className="mr-2"/> Pagamentos Recebidos</h3>
            <button onClick={() => setIsPaymentModalOpen(true)} className="text-sm text-green-600 font-medium">+ Receber</button>
          </div>
          <div className="space-y-2">
            {projectPays.map(p => (
              <div key={p.id} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                <div>
                  <div className="font-medium">{p.note || 'Pagamento'}</div>
                  <div className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="font-bold text-green-600">
                  + {formatCurrency(p.amount)}
                </div>
              </div>
            ))}
            {projectPays.length === 0 && <div className="text-center text-slate-400 text-sm py-4">Nenhum pagamento recebido.</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderChat = () => (
    <div className="flex flex-col h-[calc(100vh-6rem)] pb-20">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-secondary text-white rounded-br-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-3 rounded-2xl rounded-bl-none text-slate-500 italic text-sm">
              Pensando...
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t border-slate-200 sticky bottom-16">
        <div className="flex space-x-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Pergunte algo para ajudar na obra..."
            className="flex-1 border border-slate-300 rounded-full px-4 py-2 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button 
            onClick={handleSendMessage}
            disabled={isChatLoading || !chatInput.trim()}
            className="bg-secondary text-white p-2 rounded-full hover:bg-blue-600 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  // --- RENDER MAIN UI ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => { setActiveTab('dashboard'); setDetailView(null); }}
            className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'dashboard' ? 'text-secondary' : 'text-slate-400'}`}
          >
            <LayoutDashboard size={24} />
            <span className="text-xs mt-1">Início</span>
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'projects' ? 'text-secondary' : 'text-slate-400'}`}
          >
            <PaintBucket size={24} />
            <span className="text-xs mt-1">Obras</span>
          </button>
          <button 
            onClick={() => { setActiveTab('assistant'); setDetailView(null); }}
            className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'assistant' ? 'text-secondary' : 'text-slate-400'}`}
          >
            <MessageSquare size={24} />
            <span className="text-xs mt-1">Chat IA</span>
          </button>
        </div>
      </nav>

      {/* Global Voice Assistant */}
      <LiveAssistant />

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto p-4 pt-6 mb-16">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'projects' && (!detailView ? renderProjectList() : renderProjectDetail())}
        {activeTab === 'assistant' && renderChat()}
      </main>

      {/* Modals */}
      
      {/* Add Project Modal */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Nova Obra">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nome do Cliente</label>
            <input 
              className="w-full p-2 border border-slate-300 rounded-lg mt-1" 
              placeholder="Ex: Dona Maria"
              value={newProject.clientName || ''}
              onChange={e => setNewProject({...newProject, clientName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Título da Obra</label>
            <input 
              className="w-full p-2 border border-slate-300 rounded-lg mt-1" 
              placeholder="Ex: Pintura Externa"
              value={newProject.title || ''}
              onChange={e => setNewProject({...newProject, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Valor Combinado (R$)</label>
            <input 
              type="number"
              className="w-full p-2 border border-slate-300 rounded-lg mt-1" 
              placeholder="0.00"
              value={newProject.totalAgreedPrice || ''}
              onChange={e => setNewProject({...newProject, totalAgreedPrice: Number(e.target.value)})}
            />
          </div>
          <button 
            onClick={handleAddProject}
            className="w-full bg-secondary text-white py-3 rounded-lg font-bold mt-4"
          >
            Criar Obra
          </button>
        </div>
      </Modal>

      {/* Add Material Modal */}
      <Modal isOpen={isMaterialModalOpen} onClose={() => setIsMaterialModalOpen(false)} title="Adicionar Material">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nome do Item</label>
            <input 
              className="w-full p-2 border border-slate-300 rounded-lg mt-1" 
              placeholder="Ex: Lata Tinta Coral 18L"
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Custo Unit. (R$)</label>
              <input 
                type="number"
                className="w-full p-2 border border-slate-300 rounded-lg mt-1" 
                placeholder="0.00"
                value={newItem.cost}
                onChange={e => setNewItem({...newItem, cost: e.target.value})}
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-slate-700">Qtd.</label>
              <input 
                type="number"
                className="w-full p-2 border border-slate-300 rounded-lg mt-1" 
                value={newItem.quantity}
                onChange={e => setNewItem({...newItem, quantity: e.target.value})}
              />
            </div>
          </div>
          <button 
            onClick={handleAddMaterial}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold mt-4 hover:bg-orange-600"
          >
            Registrar Gasto
          </button>
        </div>
      </Modal>

      {/* Add Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Receber Pagamento">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Valor Recebido (R$)</label>
            <input 
              type="number"
              className="w-full p-2 border border-slate-300 rounded-lg mt-1 text-lg font-bold text-green-700" 
              placeholder="0.00"
              autoFocus
              value={newPayment.amount}
              onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Observação</label>
            <input 
              className="w-full p-2 border border-slate-300 rounded-lg mt-1" 
              placeholder="Ex: Entrada 50%"
              value={newPayment.note}
              onChange={e => setNewPayment({...newPayment, note: e.target.value})}
            />
          </div>
          <button 
            onClick={handleAddPayment}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold mt-4 hover:bg-green-700"
          >
            Confirmar Recebimento
          </button>
        </div>
      </Modal>

    </div>
  );
}