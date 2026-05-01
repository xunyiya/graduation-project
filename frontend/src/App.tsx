import { Shell } from './components/Shell';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './routes/AppRouter';

export default function App() {
  return (
    <AuthProvider>
      <Shell>
        <AppRouter />
      </Shell>
    </AuthProvider>
  );
}
