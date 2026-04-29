import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
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
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    academic_year: '',
    description: '',
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/classes');
      const data = response.data.data || response.data;
      setClasses(Array.isArray(data) ? data : data.data || []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

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
      fetchClasses(); // Refresh to get fresh data with slugs
    } catch (error: any) {
      // Only show generic error if axios interceptor didn't already handle it
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
      setClasses((prev) => prev.filter((c) => c.slug !== deleteSlug));
      toast.success('Class deleted successfully');
    } catch (error: any) {
      // Only show generic error if axios interceptor didn't already handle it
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
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cls.name.toLowerCase().includes(searchLower) ||
      cls.grade_level.toLowerCase().includes(searchLower) ||
      cls.academic_year.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Header title="Classes" description="Manage and view classes" />
      <div className="page-container">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          )}
        </div>

        {/* Class Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileX className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No classes found</p>
            <p className="text-sm mt-1">
              {isAdmin ? 'Create your first class to get started' : 'No classes available'}
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
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary">{cls.academic_year}</Badge>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                    {cls.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{cls.grade_level}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>{cls.students_count || 0} students</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{cls.teachers_count || 0} teachers</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs text-primary-500 font-medium group-hover:underline flex items-center gap-1">
                      View Details <ArrowRight className="h-3 w-3" />
                    </span>
                    {isAdmin && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cls)}>
                          <Edit className="h-3.5 w-3.5 text-gray-400" />
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
              <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label required>Class Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Class 10A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label required>Grade Level</Label>
                  <Input
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    placeholder="e.g., Grade 10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label required>Academic Year</Label>
                  <Input
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    placeholder="e.g., 2024/2025"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  {editingClass ? 'Update' : 'Create'}
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
                Delete Class
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this class? This action cannot be undone.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteSlug(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} isLoading={submitting}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ClassList;
