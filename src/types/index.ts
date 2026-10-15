export interface Course {
  id: string;
  course_id: string;
  course_name: string;
  department: string;
  duration: string;
  num_semesters: number;
  created_at?: string;
}

export interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  course_id: string;
  semester: number;
  credits: number;
  faculty: string;
  created_at?: string;
  course?: Course;
}

export interface Student {
  id: string;
  student_id: string;
  enrollment_number: string;
  name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  photo_url: string | null;
  course_id: string | null;
  semester: number;
  section: string | null;
  created_at?: string;
  course?: Course;
}

export interface Attendance {
  id: string;
  student_id: string;
  subject_id: string;
  total_classes: number;
  attended_classes: number;
  subject?: Subject;
}

export interface Marks {
  id: string;
  student_id: string;
  subject_id: string;
  internal_marks: number;
  assignment_marks: number;
  exam_marks: number;
  max_internal: number;
  max_assignment: number;
  max_exam: number;
  subject?: Subject;
}

export interface Assignment {
  id: string;
  student_id: string;
  subject_id: string;
  title: string;
  status: 'submitted' | 'pending' | 'graded';
  marks_obtained: number | null;
  max_marks: number;
  submitted_date: string | null;
  created_at?: string;
  subject?: Subject;
}

export type Page = 'dashboard' | 'students' | 'student-profile' | 'courses' | 'subjects';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
