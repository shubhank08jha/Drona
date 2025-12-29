
import { Profile, Role, Batch, Lesson, Enrollment, Submission } from '../types';

const STORAGE_KEYS = {
  PROFILES: 'edu_profiles',
  BATCHES: 'edu_batches',
  LESSONS: 'edu_lessons',
  ENROLLMENTS: 'edu_enrollments',
  SUBMISSIONS: 'edu_submissions',
  SESSION: 'edu_session'
};

const get = <T,>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const set = <T,>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const mockDb = {
  profiles: {
    create: (profile: Profile) => {
      const profiles = get<Profile[]>(STORAGE_KEYS.PROFILES, []);
      profiles.push(profile);
      set(STORAGE_KEYS.PROFILES, profiles);
    },
    get: (id: string) => get<Profile[]>(STORAGE_KEYS.PROFILES, []).find(p => p.id === id),
  },
  batches: {
    create: (batch: Batch) => {
      const batches = get<Batch[]>(STORAGE_KEYS.BATCHES, []);
      batches.push(batch);
      set(STORAGE_KEYS.BATCHES, batches);
    },
    listByTeacher: (teacherId: string) => get<Batch[]>(STORAGE_KEYS.BATCHES, []).filter(b => b.teacher_id === teacherId),
    getByCode: (code: string) => get<Batch[]>(STORAGE_KEYS.BATCHES, []).find(b => b.code === code),
  },
  enrollments: {
    create: (enrollment: Enrollment) => {
      const ens = get<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS, []);
      if (ens.some(e => e.student_id === enrollment.student_id && e.batch_code === enrollment.batch_code)) return;
      ens.push(enrollment);
      set(STORAGE_KEYS.ENROLLMENTS, ens);
    },
    listByStudent: (studentId: string) => {
      const ens = get<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS, []);
      const codes = ens.filter(e => e.student_id === studentId).map(e => e.batch_code);
      return get<Batch[]>(STORAGE_KEYS.BATCHES, []).filter(b => codes.includes(b.code));
    },
    listByBatch: (batchCode: string) => {
      const ens = get<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS, []);
      const studentIds = ens.filter(e => e.batch_code === batchCode).map(e => e.student_id);
      return get<Profile[]>(STORAGE_KEYS.PROFILES, []).filter(p => studentIds.includes(p.id));
    }
  },
  lessons: {
    create: (lesson: Lesson) => {
      const ls = get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
      ls.push(lesson);
      set(STORAGE_KEYS.LESSONS, ls);
    },
    listByBatch: (batchCode: string) => get<Lesson[]>(STORAGE_KEYS.LESSONS, []).filter(l => l.batch_code === batchCode),
  },
  submissions: {
    create: (sub: Submission) => {
      const subs = get<Submission[]>(STORAGE_KEYS.SUBMISSIONS, []);
      const idx = subs.findIndex(s => s.student_id === sub.student_id && s.lesson_id === sub.lesson_id);
      if (idx > -1) subs[idx] = sub;
      else subs.push(sub);
      set(STORAGE_KEYS.SUBMISSIONS, subs);
    },
    getByStudentAndLesson: (studentId: string, lessonId: string) => 
      get<Submission[]>(STORAGE_KEYS.SUBMISSIONS, []).find(s => s.student_id === studentId && s.lesson_id === lessonId),
    listByLesson: (lessonId: string) => get<Submission[]>(STORAGE_KEYS.SUBMISSIONS, []).filter(s => s.lesson_id === lessonId)
  }
};

export const mockAuth = {
  signUp: (data: any, role: Role) => {
    const id = Math.random().toString(36).substr(2, 9);
    const profile: Profile = {
      id,
      name: data.name,
      role,
      phone_number: data.phone,
      email: data.email
    };
    mockDb.profiles.create(profile);
    set(STORAGE_KEYS.SESSION, profile);
    return profile;
  },
  signIn: (id: string) => {
    const profile = mockDb.profiles.get(id);
    if (profile) set(STORAGE_KEYS.SESSION, profile);
    return profile;
  },
  signOut: () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },
  getSession: () => get<Profile | null>(STORAGE_KEYS.SESSION, null)
};
