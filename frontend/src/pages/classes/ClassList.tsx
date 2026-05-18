import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { CardGridSkeleton } from '../../components/skeletons';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useClasses, useGradeLevels } from '../../hooks/useApi';
import api from '../../lib/axios';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import type { ClassRoom } from '../../types';
import {
  BookOpen,
  Plus,
  Search,
  Users,
  GraduationCap,
  Trash2,
  Edit,
  Loader2,
  FileX,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

const ClassList: React.FC = () => {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // React Query hooks
  const { data: classesResponse, isLoading: loading, refetch: refetchClasses } = useClasses();
  const { data: gradeLevels = [] } = useGradeLevels();
  
  // Extract classes array from response
  const classes = React.useMemo(() => {
    if (!classesResponse) return [];
    const data = classesResponse.data || classesResponse;
    return Array.isArray(data) ? data : [];
  }, [classesResponse]);
  
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [classesByGrade, setClassesByGrade] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    academic_year: '',
    description: '',
  });

  useEffect(() => {
    const byGrade: Record<string, string[]> = {};
    classes.forEach((cls) => {
      if (!byGrade[cls.grade_level]) byGrade[cls.grade_level] = [];
      byGrade[cls.grade_level].push(cls.name);
    });
    setClassesByGrade(byGrade);
  }, [classes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass.slug}`, formData);
        toast.success('Class updated successfully');
      } else {
        await api.post('/classes', formData);
        toast.success('Class created successfully');
      }
      resetForm();
      refetchClasses();
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error(`Failed to ${editingClass ? 'update' : 'create'} class`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSlug) return;
    setSubmitting(true);
    try {
      await api.delete(`/classes/${deleteSlug}`);
      toast.success('Class deleted successfully');
      refetchClasses();
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error('Failed to delete class');
      }
    } finally {
      setSubmitting(false);
      setDeleteSlug(null);
    }
  };

  const openEdit = (cls: ClassRoom) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      grade_level: cls.grade_level,
      academic_year: cls.academic_year,
      description: cls.description || '',
    });
    setShowCreate(true);
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingClass(null);
    setFormData({ name: '', grade_level: '', academic_year: '', description: '' });
  };

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = !search || (
      cls.name.toLowerCase().includes(search.toLowerCase()) ||
      cls.grade_level.toLowerCase().includes(search.toLowerCase()) ||
      cls.academic_year.toLowerCase().includes(search.toLowerCase())
    );
    const matchesGrade = !filterGrade || cls.grade_level === filterGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <>
      <Header title={t.classes.title} description={t.classes.subtitle} />
      <div className="page-container">
        {/* Actions */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder={t.classes.searchClasses}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                options={[
                  { value: '', label: 'All Grades' },
                  ...gradeLevels.map((gl) => ({ value: gl, label: `Grade ${gl}` })),
                ]}
              />
              {isAdmin ? (
                <Button onClick={() => setShowCreate(true)} className="w-full">
                  <Plus className="h-4 w-4" />
                  {t.classes.createClass}
                </Button>
              ) : (
                <div />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Class Grid */}
        {loading ? (
          <CardGridSkeleton count={6} columns={3} />
        ) : filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <FileX className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">{t.classes.noClasses}</p>
            <p className="text-sm mt-1">
              {isAdmin ? t.classes.noClassesHint : t.classes.noClassesAvailable}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((cls) => (
              <Card
                key={cls.id}
                className="hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group"
                onClick={() => navigate(`/classes/${cls.slug}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary">{cls.academic_year}</Badge>
                  </div>

                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-primary-600 transition-colors">
                    {cls.name}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{cls.grade_level}</p>

                  <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>{cls.students_count || 0} {t.classes.students}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{cls.teachers_count || 0} {t.classes.teachers}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-700">
                    <span className="text-xs text-primary-500 font-medium group-hover:underline flex items-center gap-1">
                      {t.classes.viewDetails} <ArrowRight className="h-3 w-3" />
                    </span>
                    {isAdmin && (
                      <div 
                        className="flex gap-1" 
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="group"
                        aria-label="Class actions"
                      >
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cls)}>
                          <Edit className="h-3.5 w-3.5 text-zinc-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteSlug(cls.slug)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showCreate} onOpenChange={resetForm}>
          <DialogContent onClose={resetForm}>
            <DialogHeader>
              <DialogTitle>{editingClass ? t.classes.editClass : t.classes.createClass}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                {/* Step 1: Grade Level — chips + input */}
                <div className="space-y-2">
                  <Label required>{t.classes.gradeLevel}</Label>
                  {gradeLevels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {gradeLevels.map((gl) => (
                        <button
                          key={gl}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, grade_level: gl }))}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                            formData.grade_level === gl
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600 hover:border-primary-400 hover:text-primary-600'
                          )}
                        >
                          {gl}
                        </button>
                      ))}
                    </div>
                  )}
                  <Input
                    value={formData.grade_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade_level: e.target.value }))}
                    placeholder="e.g., 7, 8, 9, 10"
                    required
                  />
                  <p className="text-xs text-zinc-400">Select an existing grade or type a new one</p>
                </div>

                {/* Step 2: Class Name — with suggestions based on selected grade */}
                <div className="space-y-2">
                  <Label required>{t.classes.className}</Label>
                  {formData.grade_level && classesByGrade[formData.grade_level]?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      <span className="text-xs text-zinc-400 w-full">Existing in Grade {formData.grade_level}:</span>
                      {classesByGrade[formData.grade_level].map((name) => (
                        <span key={name} className="px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={formData.grade_level ? `e.g., ${formData.grade_level}A, ${formData.grade_level}B` : 'e.g., 7A, 8B'}
                    required
                  />
                </div>

                {/* Academic Year */}
                <div className="space-y-2">
                  <Label required>{t.classes.academicYear}</Label>
                  <Input
                    value={formData.academic_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                    placeholder="e.g., 2024/2025"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>{t.common.description}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" isLoading={submitting}>
                  {editingClass ? t.common.save : t.common.create}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteSlug !== null} onOpenChange={() => setDeleteSlug(null)}>
          <DialogContent onClose={() => setDeleteSlug(null)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t.classes.deleteClass}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-2">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t.classes.deleteConfirm}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteSlug(null)}>
                {t.common.cancel}
              </Button>
              <Button variant="destructive" onClick={handleDelete} isLoading={submitting}>
                {t.common.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ClassList;
