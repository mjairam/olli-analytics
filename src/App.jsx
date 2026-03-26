import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import HomePage from './pages/home/HomePage';
import SummaryPage from './pages/summary/SummaryPage';
import MembershipPage from './pages/membership/MembershipPage';
import MemberVsNonPage from './pages/memberVsNon/MemberVsNonPage';
import MemberListPage from './pages/memberList/MemberListPage';
import RegListPage from './pages/regList/RegListPage';
import ClassAnalysisPage from './pages/classAnalysis/ClassAnalysisPage';
import InstructorPage from './pages/instructor/InstructorPage';
import CatalogCleanerPage from './pages/catalogCleaner/CatalogCleanerPage';
import MailingListPage from './pages/mailingList/MailingListPage';
import ReconciliationPage from './pages/reconciliation/ReconciliationPage';

function AnalyticsLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* Analytics section — shared sidebar layout */}
          <Route element={<AnalyticsLayout />}>
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/member-vs-non" element={<MemberVsNonPage />} />
            <Route path="/member-list" element={<MemberListPage />} />
            <Route path="/reg-list" element={<RegListPage />} />
            <Route path="/class-analysis" element={<ClassAnalysisPage />} />
            <Route path="/instructor" element={<InstructorPage />} />
          </Route>

          {/* Standalone sections */}
          <Route path="/catalog-cleaner" element={<CatalogCleanerPage />} />
          <Route path="/mailing-list" element={<MailingListPage />} />
          <Route path="/reconciliation" element={<ReconciliationPage />} />
        </Routes>
      </DataProvider>
    </BrowserRouter>
  );
}
