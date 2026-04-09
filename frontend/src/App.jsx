import { useState } from 'react';
import { MessageSquare, Apple, Activity, BarChart2, User, Zap } from 'lucide-react';
import AgentView from './components/AgentView';
import GymView from './components/GymView';
import NutricionView from './components/NutricionView';
import GraficosView from './components/GraficosView';
import PerfilView from './components/PerfilView';
import LoginView from './components/LoginView';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('agente');
  const [pendingRutina, setPendingRutina] = useState(null);

  // AUTH STATE — persiste en localStorage
  const [authUser, setAuthUser] = useState(() => localStorage.getItem('vortice_user') || null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('vortice_token') || null);

  const handleLogin = (username, token) => {
    setAuthUser(username);
    setAuthToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('vortice_user');
    localStorage.removeItem('vortice_token');
    setAuthUser(null);
    setAuthToken(null);
  };

  const handleLoadRutina = (rutina) => {
    setPendingRutina(rutina);
    setActiveTab('gym');
  };

  // Si no está autenticado, mostrar login
  if (!authUser || !authToken) {
    return <LoginView onLogin={handleLogin} />;
  }

  const perfil = authUser;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agente':
        return <AgentView perfil={perfil} onLoadRutina={handleLoadRutina} />;
      case 'nutricion':
        return <NutricionView perfil={perfil} />;
      case 'gym':
        return <GymView perfil={perfil} pendingRutina={pendingRutina} onRutinaLoaded={() => setPendingRutina(null)} />;
      case 'graficos':
        return <GraficosView perfil={perfil} />;
      case 'perfil':
        return <PerfilView perfil={perfil} onLogout={handleLogout} />;
      default:
        return <div>Seleccioná una pestaña</div>;
    }
  };

  const tabs = [
    { id: 'agente',    icon: MessageSquare, label: 'Coach'    },
    { id: 'nutricion', icon: Apple,         label: 'Nutrición'},
    { id: 'gym',       icon: Activity,      label: 'Gym'      },
    { id: 'graficos',  icon: BarChart2,     label: 'Stats'    },
    { id: 'perfil',    icon: User,          label: 'Perfil'   },
  ];

  return (
    <>
      <header className="top-header">
        <div className="title-main">
          <Zap size={22} color="#38bdf8" />
          <span>Vórtice</span>
          <span style={{fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '0.25rem'}}>Health</span>
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <div className="profile-active-tag">
              <span className="dot pulse"></span>
              {perfil}
            </div>
          </div>
        </div>
      </header>

      <nav className="tabs-nav">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              className={`tab-btn ${isActive ? 'active' : ''}`} 
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={19} />
              <span>{tab.label}</span>
              {tab.id === 'gym' && pendingRutina && (
                <span className="tab-badge">!</span>
              )}
            </button>
          );
        })}
      </nav>

      <main className="main-content">
        {renderTabContent()}
      </main>
    </>
  );
}

export default App;
