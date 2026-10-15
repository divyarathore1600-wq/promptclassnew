import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { ToastProvider } from '@/components/Toast';
import { Dashboard } from '@/pages/Dashboard';
import { StudentList } from '@/pages/StudentList';
import { StudentProfile } from '@/pages/StudentProfile';
import { CourseManagement } from '@/pages/CourseManagement';
import { SubjectManagement } from '@/pages/SubjectManagement';
import type { Page } from '@/types';

const pageTitles: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your college' },
  students: { title: 'Students', subtitle: 'Manage student records' },
  'student-profile': { title: 'Student Profile', subtitle: 'Detailed student information' },
  courses: { title: 'Courses', subtitle: 'Manage degree programs' },
  subjects: { title: 'Subjects', subtitle: 'Manage course subjects' },
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    if (page !== 'student-profile') {
      setSelectedStudentId(null);
    }
  };

  const viewStudent = (id: string) => {
    setSelectedStudentId(id);
    setCurrentPage('student-profile');
  };

  const { title, subtitle } = pageTitles[currentPage];

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} subtitle={subtitle} onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {currentPage === 'dashboard' && <Dashboard onNavigate={navigate} onViewStudent={viewStudent} />}
          {currentPage === 'students' && <StudentList onViewStudent={viewStudent} />}
          {currentPage === 'student-profile' && selectedStudentId && (
            <StudentProfile studentId={selectedStudentId} onBack={() => navigate('students')} />
          )}
          {currentPage === 'courses' && <CourseManagement />}
          {currentPage === 'subjects' && <SubjectManagement />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
