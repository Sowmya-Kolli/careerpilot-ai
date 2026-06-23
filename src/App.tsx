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

function AppContent() {
  const { currentView, setView } = useApp();

  useEffect(() => {
    const isOnboarded = localStorage.getItem("careerpilot_onboarded") === "true";
    if (!isOnboarded && currentView !== "guide") {
      setView("guide");
    }
  }, [currentView, setView]);

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
