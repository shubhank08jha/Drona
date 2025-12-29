
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Profile, Batch, Lesson } from '../types';
import { mockDb } from '../services/supabaseService';

interface StudentDashboardProps {
  user: Profile;
  onLogout: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onLogout }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setBatches(mockDb.enrollments.listByStudent(user.id));
  }, [user.id]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const batch = mockDb.batches.getByCode(classCode.toUpperCase());
    if (batch) {
      await mockDb.enrollments.create({ student_id: user.id, batch_code: batch.code });
      setBatches(mockDb.enrollments.listByStudent(user.id));
      setClassCode('');
    } else {
      setError('Invalid class code. Please check and try again.');
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">D</div>
          <span className="font-black text-xl tracking-tighter italic">DRONA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm hidden sm:inline">Welcome, <span className="text-white font-medium">{user.name}</span></span>
          <button onClick={onLogout} className="text-sm text-slate-400 hover:text-red-400 transition-colors">Logout</button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 lg:p-10 max-w-5xl mx-auto w-full space-y-12">
        <section className="text-center space-y-6 max-w-xl mx-auto">
          <h1 className="text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Enter the Dojo</h1>
          <form onSubmit={handleJoinClass} className="space-y-4">
            <input
              required
              className="w-full bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-3xl px-6 py-6 text-3xl text-center font-mono tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500/50 uppercase"
              placeholder="PHY-882"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
            />
            {error && <p className="text-red-400 text-sm mt-2 font-medium">{error}</p>}
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-3xl shadow-2xl transition-all text-xl">Join Class</button>
          </form>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">My Classrooms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {batches.map(batch => {
              const lessons = mockDb.lessons.listByBatch(batch.code).filter(l => new Date(l.scheduled_at) <= new Date());
              const completed = lessons.filter(l => mockDb.submissions.getByStudentAndLesson(user.id, l.id)?.status === 'Approved').length;
              const progress = lessons.length > 0 ? (completed / lessons.length) * 100 : 0;
              
              return (
                <div key={batch.code} className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] hover:border-emerald-500/30 transition-all shadow-xl">
                  <h3 className="text-2xl font-bold mb-4">{batch.title}</h3>
                  <div className="space-y-4">
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-bold uppercase tracking-widest">
                      <span>{completed} Completed</span>
                      <span>{lessons.length} Modules Total</span>
                    </div>
                    <Link to={`/student/batch/${batch.code}`} className="block text-center bg-white/5 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-all">Syllabus</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export const StudentBatchDetails: React.FC<{user: Profile, onLogout: () => void}> = ({ user, onLogout }) => {
  const { code } = useParams<{ code: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    if (code) {
      setBatch(mockDb.batches.getByCode(code) || null);
      setLessons(mockDb.lessons.listByBatch(code).filter(l => new Date(l.scheduled_at) <= new Date()));
    }
  }, [code]);

  if (!batch) return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="flex flex-col h-screen">
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
        <Link to="/student" className="text-slate-400 flex items-center gap-2 hover:text-emerald-400 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          <span className="font-bold">{batch.title}</span>
        </Link>
        <button onClick={onLogout} className="text-sm text-slate-400">Logout</button>
      </header>

      <main className="flex-1 overflow-auto p-6 lg:p-10 max-w-4xl mx-auto w-full space-y-8">
        <h1 className="text-4xl font-extrabold">Active Curriculum</h1>
        <div className="grid gap-6">
          {lessons.map((lesson, idx) => {
            const sub = mockDb.submissions.getByStudentAndLesson(user.id, lesson.id);
            const isCompleted = sub?.status === 'Approved';
            return (
              <Link 
                key={lesson.id} 
                to={`/lesson/${batch.code}/${lesson.id}`}
                className={`flex items-center gap-6 bg-slate-900 border ${isCompleted ? 'border-emerald-500/30' : 'border-slate-800'} p-6 rounded-[2rem] hover:scale-[1.01] transition-all relative overflow-hidden`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{lesson.title}</h3>
                  <p className="text-slate-500 text-xs">Due: {new Date(lesson.deadline).toLocaleDateString()}</p>
                </div>
                {isCompleted && <span className="text-emerald-500 font-black">MASTERED</span>}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
