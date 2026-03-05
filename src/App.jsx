import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import SummaryPage from './pages/summary/SummaryPage';
import MembershipPage from './pages/membership/MembershipPage';
import MemberVsNonPage from './pages/memberVsNon/MemberVsNonPage';
import MemberListPage from './pages/memberList/MemberListPage';
import RegListPage from './pages/regList/RegListPage';
import ClassAnalysisPage from './pages/classAnalysis/ClassAnalysisPage';
import CatalogCleanerPage from './pages/catalogCleaner/CatalogCleanerPage';

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/summary" replace />} />
              <Route path="/summary" element={<SummaryPage />} />
              <Route path="/membership" element={<MembershipPage />} />
              <Route path="/member-vs-non" element={<MemberVsNonPage />} />
              <Route path="/member-list" element={<MemberListPage />} />
              <Route path="/reg-list" element={<RegListPage />} />
              <Route path="/class-analysis" element={<ClassAnalysisPage />} />
              <Route path="/catalog-cleaner" element={<CatalogCleanerPage />} />
            </Routes>
          </main>
        </div>
      </DataProvider>
    </BrowserRouter>
  );
}
