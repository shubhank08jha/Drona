
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Profile, Role } from './types';
import { mockAuth } from './services/supabaseService';
import AuthPage from './components/AuthPage';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard, { StudentBatchDetails } from './components/StudentDashboard';
import LessonView from './components/LessonView';

const App: React.FC = () => {
  const [user, setUser] = useState<Profile | null>(mockAuth.getSession());
  const navigate = useNavigate();

  useEffect(() => {
    const session = mockAuth.getSession();
    if (session) setUser(session);
  }, []);

  const handleAuthSuccess = (profile: Profile) => {
    setUser(profile);
    if (profile.role === Role.TEACHER) navigate('/teacher');
    else navigate('/student');
  };

  const handleLogout = () => {
    mockAuth.signOut();
    setUser(null);
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      <Routes>
        <Route 
          path="/auth" 
          element={user ? <Navigate to={user.role === Role.TEACHER ? "/teacher" : "/student"} /> : <AuthPage onAuthSuccess={handleAuthSuccess} />} 
        />
        
        <Route 
          path="/teacher/*" 
          element={user?.role === Role.TEACHER ? <TeacherDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} 
        />
        
        <Route 
          path="/student" 
          element={user?.role === Role.STUDENT ? <StudentDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} 
        />

        <Route 
          path="/student/batch/:code" 
          element={user?.role === Role.STUDENT ? <StudentBatchDetails user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} 
        />
        
        <Route 
          path="/lesson/:batchCode/:lessonId" 
          element={user ? <LessonView user={user} /> : <Navigate to="/auth" />} 
        />

        <Route path="/" element={<Navigate to="/auth" />} />
      </Routes>
    </div>
  );
};

export default App;
