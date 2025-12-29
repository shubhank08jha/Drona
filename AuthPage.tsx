
import React, { useState } from 'react';
import { Role, Profile } from '../types';
import { mockAuth } from '../services/supabaseService';

interface AuthPageProps {
  onAuthSuccess: (profile: Profile) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState<Role>(Role.STUDENT);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const profile = await mockAuth.signUp(formData, activeTab);
    onAuthSuccess(profile);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab(Role.STUDENT)}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === Role.STUDENT ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            I am a Student
          </button>
          <button
            onClick={() => setActiveTab(Role.TEACHER)}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === Role.TEACHER ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            I am a Teacher
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-black text-white mb-2 italic tracking-tighter">DRONA</h1>
            <p className="text-slate-400 text-sm">Empowering the next generation of learners</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {activeTab === Role.TEACHER ? (
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="teacher@school.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98]"
          >
            Create {activeTab === Role.TEACHER ? 'Teacher' : 'Student'} Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
