import { useEffect, useState } from 'react';
import { Users, BookOpen, Library, GraduationCap, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LoadingOverlay } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { getGrade, getGradeColor, getAttendanceColor } from '@/lib/utils';
import type { Student, Course, Subject } from '@/types';

interface DashboardProps {
  onNavigate: (page: 'students' | 'courses' | 'subjects') => void;
  onViewStudent: (id: string) => void;
}

interface Stats {
  students: Student[];
  courses: Course[];
  subjects: Subject[];
}

export function Dashboard({ onNavigate, onViewStudent }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topStudents, setTopStudents] = useState<{ student: Student; percentage: number }[]>([]);

  useEffect(() => {
    async function load() {
      const [studentsRes, coursesRes, subjectsRes] = await Promise.all([
        supabase.from('students').select('*, course:courses(*)').order('name'),
        supabase.from('courses').select('*').order('course_name'),
        supabase.from('subjects').select('*, course:courses(*)').order('subject_name'),
      ]);

      const students = (studentsRes.data || []) as Student[];
      const courses = (coursesRes.data || []) as Course[];
      const subjects = (subjectsRes.data || []) as Subject[];

      setStats({ students, courses, subjects });

      // Calculate top students by overall percentage
      if (students.length > 0) {
        const marksRes = await supabase
          .from('marks')
          .select('student_id, internal_marks, assignment_marks, exam_marks, max_internal, max_assignment, max_exam');
        const allMarks = marksRes.data || [];

        const studentPercentages = students.map((student) => {
          const studentMarks = allMarks.filter((m) => m.student_id === student.id);
          if (studentMarks.length === 0) return { student, percentage: 0 };
          const totalObtained = studentMarks.reduce(
            (sum, m) => sum + Number(m.internal_marks) + Number(m.assignment_marks) + Number(m.exam_marks),
            0
          );
          const totalMax = studentMarks.reduce(
            (sum, m) => sum + Number(m.max_internal) + Number(m.max_assignment) + Number(m.max_exam),
            0
          );
          return { student, percentage: totalMax > 0 ? (totalObtained / totalMax) * 100 : 0 };
        });

        setTopStudents(studentPercentages.sort((a, b) => b.percentage - a.percentage).slice(0, 5));
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LoadingOverlay label="Loading dashboard..." />;

  if (!stats) return null;

  const statCards = [
    {
      label: 'Total Students',
      value: stats.students.length,
      icon: Users,
      color: 'bg-primary-500',
      bg: 'bg-primary-50',
      onClick: () => onNavigate('students'),
    },
    {
      label: 'Total Courses',
      value: stats.courses.length,
      icon: BookOpen,
      color: 'bg-accent-500',
      bg: 'bg-accent-50',
      onClick: () => onNavigate('courses'),
    },
    {
      label: 'Total Subjects',
      value: stats.subjects.length,
      icon: Library,
      color: 'bg-success-500',
      bg: 'bg-success-50',
      onClick: () => onNavigate('subjects'),
    },
    {
      label: 'Departments',
      value: new Set(stats.courses.map((c) => c.department)).size,
      icon: GraduationCap,
      color: 'bg-warning-500',
      bg: 'bg-warning-50',
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-700 via-primary-600 to-accent-600 p-6 lg:p-8 text-white">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Welcome back, Admin</h2>
          <p className="text-primary-100 text-sm">Here's what's happening at your college today.</p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute right-8 bottom-0 w-40 h-40 bg-white/5 rounded-full -mb-20" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={card.onClick}
              className="card p-5 text-left hover:shadow-md transition-shadow duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
                <span className="text-3xl font-bold text-ink-900 group-hover:text-primary-600 transition-colors">
                  {card.value}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-ink-600">{card.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top performing students */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-warning-500" />
            <h3 className="text-base font-semibold text-ink-900">Top Performing Students</h3>
          </div>
          {topStudents.length === 0 ? (
            <EmptyState title="No data available" description="Student marks data will appear here." />
          ) : (
            <div className="space-y-3">
              {topStudents.map((item, idx) => (
                <button
                  key={item.student.id}
                  onClick={() => onViewStudent(item.student.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-ink-50 transition-colors text-left"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      idx === 0
                        ? 'bg-warning-100 text-warning-700'
                        : idx === 1
                        ? 'bg-ink-200 text-ink-700'
                        : idx === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-ink-100 text-ink-500'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{item.student.name}</p>
                    <p className="text-xs text-ink-500">{item.student.student_id}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-ink-800">{item.percentage.toFixed(1)}%</span>
                    <span className={`badge ${getGradeColor(item.percentage)}`}>{getGrade(item.percentage)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Course distribution */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary-500" />
            <h3 className="text-base font-semibold text-ink-900">Course Enrollment</h3>
          </div>
          {stats.courses.length === 0 ? (
            <EmptyState title="No courses yet" description="Add courses to see enrollment data." />
          ) : (
            <div className="space-y-3">
              {stats.courses.map((course) => {
                const count = stats.students.filter((s) => s.course_id === course.id).length;
                const maxCount = Math.max(...stats.courses.map((c) => stats.students.filter((s) => s.course_id === c.id).length), 1);
                const width = (count / maxCount) * 100;
                return (
                  <div key={course.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-ink-700 truncate">{course.course_name}</p>
                      <span className="text-sm font-semibold text-ink-600 flex-shrink-0 ml-2">{count}</span>
                    </div>
                    <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent students */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-500" />
            <h3 className="text-base font-semibold text-ink-900">Recently Added Students</h3>
          </div>
          <button onClick={() => onNavigate('students')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </button>
        </div>
        {stats.students.length === 0 ? (
          <EmptyState title="No students yet" description="Add students to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-200">
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">Student</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3 hidden sm:table-cell">Course</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3 hidden md:table-cell">Semester</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.students.slice(0, 5).map((student) => (
                  <tr key={student.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {student.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-800 truncate">{student.name}</p>
                          <p className="text-xs text-ink-500">{student.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell">
                      <p className="text-sm text-ink-600 truncate max-w-[180px]">{student.course?.course_name || '—'}</p>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      <span className="badge bg-primary-100 text-primary-700">Sem {student.semester}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onViewStudent(student.id)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
