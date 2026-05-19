import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { useTranslation } from '../../hooks/useTranslation';
import { useClasses, useSubjects, useAssignment } from '../../hooks/useApi';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';

const AssignmentCreate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    due_date: '',
    max_score: '100',
    allow_late_submission: false,
    allow_resubmission: false,
  });

  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: existingAssignment, isLoading: loadingAssignment } = useAssignment(id || '', {
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingAssignment && isEditing) {
      setFormData({
        title: existingAssignment.title || '',
        description: existingAssignment.description || '',
        class_id: String(existingAssignment.class_id || ''),
        subject_id: String(existingAssignment.subject_id || ''),
        due_date: existingAssignment.due_date
          ? new Date(existingAssignment.due_date).toISOString().slice(0, 16)
          : '',
        max_score: String(existingAssignment.max_score || 100),
        allow_late_submission: existingAssignment.allow_late_submission || false,
        allow_resubmission: existingAssignment.allow_resubmission || false,
      });
    }
  }, [existingAssignment, isEditing]);

  // Fetch classes and subjects
  const { data: classesData } = useClasses({ per_page: 100 });
  const classes = classesData?.data || [];
  const { data: subjects } = useSubjects();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t.assignments.fileTooLarge);
        return;
      }
      setAttachment(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error(t.common.required);
      return;
    }
    if (!formData.description.trim()) {
      toast.error(t.common.required);
      return;
    }
    if (!formData.class_id) {
      toast.error(t.common.required);
      return;
    }
    if (!formData.due_date) {
      toast.error(t.common.required);
      return;
    }
    if (!formData.max_score || parseInt(formData.max_score) <= 0) {
      toast.error(t.common.required);
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('class_id', formData.class_id);
      if (formData.subject_id) {
        data.append('subject_id', formData.subject_id);
      }
      data.append('due_date', formData.due_date);
      data.append('max_score', formData.max_score);
      data.append('allow_late_submission', formData.allow_late_submission ? '1' : '0');
      data.append('allow_resubmission', formData.allow_resubmission ? '1' : '0');
      if (attachment) {
        data.append('attachment', attachment);
      }

      let response;
      if (isEditing) {
        data.append('_method', 'PUT');
        response = await api.post(`/assignments/${id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(t.assignments?.updateSuccess || 'Assignment updated successfully!');
      } else {
        response = await api.post('/assignments', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(t.assignments.createSuccess);
      }

      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      if (id || response.data.data?.id) {
        queryClient.invalidateQueries({ queryKey: ['assignments', id || String(response.data.data.id)] });
      }
      navigate(`/assignments/${id || response.data.data?.id}`);
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error(error.response?.data?.message || (t as any).assignments?.failedSave || 'Failed to save assignment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isEditing && loadingAssignment) {
    return (
      <>
        <Header title={(t as any).assignments?.editAssignment || 'Edit Assignment'} description="" />
        <div className="page-container">
          <div className="space-y-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={isEditing ? (t.assignments?.editAssignment || 'Edit Assignment') : t.assignments.createAssignment}
        description={t.assignments.subtitle}
      />
      <div className="page-container">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/assignments')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t.common.back}
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {t.assignments.assignmentTitle} <span className="text-red-500">*</span>
              </label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={t.common.title}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {t.assignments.assignmentDescription} <span className="text-red-500">*</span>
              </label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t.common.description}
                rows={6}
                required
              />
            </div>

            {/* Class and Subject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t.assignments.class} <span className="text-red-500">*</span>
                </label>
                <Select
                  name="class_id"
                  value={formData.class_id}
                  onChange={handleChange}
                  options={classes.map((cls) => ({ value: cls.id.toString(), label: cls.name }))}
                  placeholder={t.quizzes.selectClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t.assignments.subject}
                </label>
                <Select
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={handleChange}
                  options={subjects?.map((subject) => ({ value: subject.id.toString(), label: subject.name })) || []}
                  placeholder={t.quizzes.selectSubject}
                />
              </div>
            </div>

            {/* Due Date and Max Score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t.assignments.dueDate} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t.assignments.maxScore} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  name="max_score"
                  value={formData.max_score}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allow_late_submission"
                  checked={formData.allow_late_submission}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {t.assignments.allowLateSubmission}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allow_resubmission"
                  checked={formData.allow_resubmission}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {t.assignments.allowResubmission}
                </span>
              </label>
            </div>

            {/* Attachment */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {t.assignments.attachment}
              </label>
              {attachment ? (
                <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{attachment.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {(attachment.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={removeAttachment}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.assignments.dragDropFile}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{t.assignments.maxFileSize}</p>
                  </div>
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <Button type="button" variant="ghost" onClick={() => navigate('/assignments')}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? (t.assignments?.editAssignment || 'Update Assignment') : t.common.create}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
    </>
  );
};

export default AssignmentCreate;
