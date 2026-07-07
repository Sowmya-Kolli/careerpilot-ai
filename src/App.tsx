import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { EmailIntelligenceView } from './components/EmailIntelligenceView';
import { TrackerView } from './components/TrackerView';
import { AgentActivityView } from './components/AgentActivityView';
import { CalendarView } from './components/CalendarView';
import { SettingsView } from './components/SettingsView';
import { GuideView } from './components/GuideView';
import { LoginView } from './components/LoginView';

function AppContent() {
  const { currentView, setView, jwtToken, demoMode, backendReady } = useApp();

  useEffect(() => {
    const isAuthenticated = !!jwtToken || demoMode;
    const isOnboarded = localStorage.getItem("careerpilot_onboarded") === "true";

    if (!isAuthenticated) {
      // If not authenticated, restrict to landing, login, register, and guide
      if (currentView !== "landing" && currentView !== "login" && currentView !== "register" && currentView !== "guide") {
        setView("landing");
      }
    } else {
      // If authenticated:
      if (!isOnboarded) {
        if (currentView !== "guide") {
          setView("guide");
        }
      } else {
        // If onboarded, redirect away from unauthenticated pages
        if (currentView === "landing" || currentView === "login" || currentView === "register") {
          setView("dashboard");
        }
      }
    }
  }, [currentView, setView, jwtToken, demoMode]);

  if (!backendReady && !demoMode) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "radial-gradient(circle at center, #0f172a 0%, #020617 100%)",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          padding: "40px",
          borderRadius: "24px",
          background: "rgba(255, 255, 255, 0.01)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          maxWidth: "450px",
          width: "90%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px"
        }}>
          <div style={{
            position: "relative",
            width: "80px",
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <div className="spin-circle-1" style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "3px solid transparent",
              borderTopColor: "#6366f1",
              animation: "spin 1s linear infinite"
            }} />
            <div className="spin-circle-2" style={{
              position: "absolute",
              width: "80%",
              height: "80%",
              borderRadius: "50%",
              border: "3px solid transparent",
              borderBottomColor: "#a855f7",
              animation: "spin 1.5s linear infinite reverse"
            }} />
            <svg style={{ width: "32px", height: "32px", color: "#6366f1" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/>
              <line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>Initializing CareerPilot</h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
              Connecting to remote database and verifying API servers. This will take just a moment.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: "10px 20px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#e2e8f0",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Retry Connection
          </button>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!jwtToken && !demoMode) {
    if (currentView === "landing") {
      return <LandingView setView={setView} />;
    } else if (currentView === "guide") {
      return (
        <Layout currentView={currentView} setView={setView}>
          <GuideView />
        </Layout>
      );
    }
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case "landing":
        return <LandingView setView={setView} />;
      case "guide":
        return <GuideView />;
      case "dashboard":
        return <DashboardView setView={setView} />;
      case "intelligence":
        return <EmailIntelligenceView />;
      case "tracker":
        return <TrackerView />;
      case "calendar":
        return <CalendarView />;
      case "activity":
        return <AgentActivityView />;
      case "settings":
        return <SettingsView />;
      default:
        return <LandingView setView={setView} />;
    }
  };

  return (
    <Layout currentView={currentView} setView={setView}>
      {renderActiveView()}
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
