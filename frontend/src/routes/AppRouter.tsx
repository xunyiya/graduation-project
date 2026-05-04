import { Navigate, Route, Routes } from 'react-router-dom';

import { CompareJobsPage } from '../pages/CompareJobsPage';
import { ComparePage } from '../pages/ComparePage';
import { FileRecordsPage } from '../pages/FileRecordsPage';
import { HistoryPage } from '../pages/HistoryPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/compare"
        element={
          <ProtectedRoute>
            <ComparePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/files"
        element={
          <ProtectedRoute>
            <FileRecordsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <CompareJobsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
