
export enum Role {
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export interface Profile {
  id: string;
  name: string;
  role: Role;
  phone_number?: string;
  email?: string;
}

export interface Batch {
  code: string;
  teacher_id: string;
  title: string;
}

export interface Enrollment {
  student_id: string;
  batch_code: string;
}

export interface Lesson {
  id: string;
  batch_code: string;
  title: string;
  youtube_url: string;
  homework_description: string;
  homework_url?: string;
  deadline: string;
  scheduled_at: string; 
  answer_key_url: string;
}

export interface Submission {
  id: string;
  student_id: string;
  lesson_id: string;
  image_url: string;
  ai_score: number | null;
  ai_feedback: string | null;
  status: 'Approved' | 'Rejected' | 'Pending';
  student_name?: string; 
  created_at?: string;
}

export interface Note {
  id: string;
  lesson_id: string;
  student_id: string;
  timestamp: number;
  content: string;
}

export interface GeminiResponse {
  status: 'Approved' | 'Rejected';
  score: number;
  feedback: string;
}
