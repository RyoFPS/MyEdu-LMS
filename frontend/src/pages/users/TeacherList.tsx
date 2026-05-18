import React, { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';
import { CardGridSkeleton } from '../../components/skeletons';
import { useTranslation } from '../../hooks/useTranslation';
import api from '../../lib/axios';
import type { User } from '../../types';
import {
  Search,
  Mail,
  Phone,
  BookOpen,
  FileX,
  UserCircle,
} from 'lucide-react';

const TeacherList: React.FC = () => {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users', { params: { role: 'teacher' } });
      const data = response.data.data || response.data;
      setTeachers(Array.isArray(data) ? data : data.data || []);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((teacher) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      teacher.name.toLowerCase().includes(searchLower) ||
      teacher.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Header title={t.sidebar.teachers} description={`${t.common.view} ${t.sidebar.teachers.toLowerCase()}`} />
      <div className="page-container">
        {/* Search */}
        <div className="flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-primary-500" />
          <h2 className="text-lg font-semibold">{t.sidebar.teachers}</h2>
          <Badge variant="secondary">{teachers.length}</Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t.common.search + '...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Teacher Grid */}
        {loading ? (
          <CardGridSkeleton count={6} columns={3} />
        ) : filteredTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileX className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">{t.common.noData}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => (
              <Card key={teacher.id} className="hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar name={teacher.name} src={teacher.avatar} size="lg" previewable />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{teacher.name}</h3>
                      <Badge variant="info" className="mt-1">{t.users.teacher}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{teacher.email}</span>
                    </div>
                    {teacher.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{teacher.phone}</span>
                      </div>
                    )}
                    {(teacher as any).subjects?.length > 0 ? (
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {(teacher as any).subjects.map((s: any) => (
                            <Badge key={s.id} variant="outline" className="text-xs py-0">
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-gray-400 italic text-xs">No subjects assigned</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default TeacherList;
