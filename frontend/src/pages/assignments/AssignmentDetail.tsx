import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { CardGridSkeleton } from '../../components/skeletons';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useAssignment, useAssignmentSubmissions } from '../../hooks/useApi';
import { formatDateTime } from '../../lib/utils';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  Tag,
  User,
  Clock,
  AlertTriangle,
  Download,
  Upload,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import type { AssignmentSubmission } from '../../types';

const AssignmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isTeacher, isAdmin, isStudent } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);

  // Fetch assignment data
  const { data: assignment, isLoading: loadingAssignment, refetch: refetchAssignment } = useAssignment(id!);
  const { data: submissions, refetch: refetchSubmissions } = useAssignmentSubmissions(id!, {
    enabled: isTeacher || isAdmin,
  });

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/assignments/${id}`);
      toast.success(t.assignments.deleteSuccess);
      navigate('/assignments');
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error('Failed to delete assignment');
      }
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDownloadAttachment = async () => {
    if (!assignment?.attachment_path) return;
    try {
      const response = await api.get(`/assignments/${id}/download-attachment`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', assignment.attachment_name || 'attachment');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download attachment');
    }
  };

  const handleDownloadSubmission = async (submission: AssignmentSubmission) => {
    try {
      const response = await api.get(`/assignments/${id}/submissions/${submission.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', submission.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download submission');
    }
  };

  const openGradeDialog = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setGradeDialogOpen(true);
  };

  if (loadingAssignment) {
    return <CardGridSkeleton count={1} />;
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Assignment Not Found</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-zinc-400 mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">Assignment not found</p>
            <Button onClick={() => navigate('/assignments')} className="mt-4">
              {t.common.back}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSubmit = isStudent && (!assignment.my_submission || assignment.allow_resubmission);
  const canEdit = isTeacher || isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{assignment.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{t.assignments.assignmentDetails}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/assignments')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t.common.back}
          </Button>
          {canEdit && (
            <>
              <Button variant="ghost" onClick={() => navigate(`/assignments/${id}/edit`)} className="gap-2">
                <Edit className="h-4 w-4" />
                {t.common.edit}
              </Button>
              <Button variant="ghost" onClick={() => setDeleteDialogOpen(true)} className="gap-2 text-red-600">
                <Trash2 className="h-4 w-4" />
                {t.common.delete}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Assignment Info */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{assignment.class_name}</span>
            </div>
            {assignment.subject_name && (
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-zinc-400" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{assignment.subject_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{assignment.teacher_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Due: {formatDateTime(assignment.due_date)}
              </span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {assignment.is_overdue ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t.assignments.overdue}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {assignment.days_until_due === 0
                  ? t.assignments.dueToday
                  : assignment.days_until_due === 1
                  ? t.assignments.dayUntilDue
                  : t.assignments.daysUntilDue.replace('{days}', assignment.days_until_due.toString())}
              </Badge>
            )}
            <Badge variant="secondary">Max Score: {assignment.max_score}</Badge>
            {assignment.allow_late_submission && (
              <Badge variant="secondary">{t.assignments.lateSubmissionAllowed}</Badge>
            )}
            {assignment.allow_resubmission && (
              <Badge variant="secondary">{t.assignments.resubmissionAllowed}</Badge>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {t.assignments.assignmentDescription}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{assignment.description}</p>
          </div>

          {/* Attachment */}
          {assignment.attachment_path && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                {t.assignments.attachment}
              </h3>
              <Button variant="outline" onClick={handleDownloadAttachment} className="gap-2">
                <Download className="h-4 w-4" />
                {assignment.attachment_name}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student View - Submission Status */}
      {isStudent && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.assignments.mySubmission}</h3>
              {canSubmit && (
                <Button onClick={() => setSubmitDialogOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {assignment.my_submission ? t.assignments.resubmit : t.assignments.submitAssignment}
                </Button>
              )}
            </div>

            {assignment.my_submission ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {assignment.my_submission.is_graded ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t.assignments.graded}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      {t.assignments.pending}
                    </Badge>
                  )}
                  {assignment.my_submission.is_late && (
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {t.assignments.late}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.assignments.submittedAt}</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {formatDateTime(assignment.my_submission.submitted_at)}
                    </p>
                  </div>
                  {assignment.my_submission.is_graded && (
                    <>
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.assignments.score}</p>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {assignment.my_submission.score} / {assignment.max_score}
                        </p>
                      </div>
                      {assignment.my_submission.feedback && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{t.assignments.feedback}</p>
                          <p className="text-sm text-zinc-900 dark:text-white">{assignment.my_submission.feedback}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleDownloadSubmission(assignment.my_submission!)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t.assignments.downloadSubmission}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <XCircle className="h-12 w-12 text-zinc-400 mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400">{t.assignments.notSubmitted}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Teacher/Admin View - Submissions */}
      {(isTeacher || isAdmin) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              {t.assignments.submissions} ({submissions?.length || 0})
            </h3>

            {submissions && submissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-white">
                        Student
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-white">
                        Submitted At
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-white">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-white">
                        Score
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="border-b border-zinc-200 dark:border-zinc-700">
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                              {submission.student_name}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{submission.student_email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {formatDateTime(submission.submitted_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {submission.is_graded ? (
                              <Badge variant="success" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {t.assignments.graded}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <FileText className="h-3 w-3" />
                                {t.assignments.pending}
                              </Badge>
                            )}
                            {submission.is_late && (
                              <Badge variant="warning" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {t.assignments.late}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {submission.is_graded ? `${submission.score} / ${assignment.max_score}` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadSubmission(submission)}
                              className="gap-1"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openGradeDialog(submission)}
                              className="gap-1"
                            >
                              {submission.is_graded ? t.common.edit : t.assignments.gradeSubmission}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-zinc-400 mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400">{t.assignments.noSubmissions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.assignments.deleteAssignment}</DialogTitle>
            <DialogDescription>{t.assignments.deleteWarning}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Assignment Dialog */}
      {isStudent && (
        <SubmitAssignmentModal
          open={submitDialogOpen}
          onClose={() => setSubmitDialogOpen(false)}
          assignmentId={id!}
          maxScore={assignment.max_score}
          previousSubmission={assignment.my_submission}
          onSuccess={() => {
            refetchAssignment();
            setSubmitDialogOpen(false);
          }}
        />
      )}

      {/* Grade Submission Dialog */}
      {(isTeacher || isAdmin) && selectedSubmission && (
        <GradeSubmissionModal
          open={gradeDialogOpen}
          onClose={() => {
            setGradeDialogOpen(false);
            setSelectedSubmission(null);
          }}
          assignmentId={id!}
          submission={selectedSubmission}
          maxScore={assignment.max_score}
          onSuccess={() => {
            refetchSubmissions();
            refetchAssignment();
            setGradeDialogOpen(false);
            setSelectedSubmission(null);
          }}
        />
      )}
    </div>
  );
};

// Submit Assignment Modal Component
interface SubmitAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  maxScore: number;
  previousSubmission?: AssignmentSubmission;
  onSuccess: () => void;
}

const SubmitAssignmentModal: React.FC<SubmitAssignmentModalProps> = ({
  open,
  onClose,
  assignmentId,
  previousSubmission,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error(t.assignments.fileTooLarge);
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg',
      ];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error(t.assignments.invalidFileType);
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/assignments/${assignmentId}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(t.assignments.submitSuccess);
      onSuccess();
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error(error.response?.data?.message || 'Failed to submit assignment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{previousSubmission ? t.assignments.resubmit : t.assignments.submitAssignment}</DialogTitle>
          <DialogDescription>
            {previousSubmission && (
              <div className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t.assignments.previousSubmission}: {previousSubmission.file_name}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t.assignments.submissionFile}
            </label>
            {file ? (
              <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.assignments.dragDropFile}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{t.assignments.allowedFormats}</p>
                </div>
                <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,image/*" />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!file || submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.common.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Grade Submission Modal Component
interface GradeSubmissionModalProps {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  submission: AssignmentSubmission;
  maxScore: number;
  onSuccess: () => void;
}

const GradeSubmissionModal: React.FC<GradeSubmissionModalProps> = ({
  open,
  onClose,
  assignmentId,
  submission,
  maxScore,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [score, setScore] = useState(submission.score?.toString() || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [grading, setGrading] = useState(false);

  const handleSubmit = async () => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore) {
      toast.error(`Score must be between 0 and ${maxScore}`);
      return;
    }

    setGrading(true);
    try {
      await api.post(`/assignments/${assignmentId}/submissions/${submission.id}/grade`, {
        score: scoreNum,
        feedback: feedback.trim() || null,
      });

      toast.success(t.assignments.gradeSuccess);
      onSuccess();
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error('Failed to grade submission');
      }
    } finally {
      setGrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.assignments.gradeSubmission}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">{t.assignments.studentInfo}</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{submission.student_name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">{submission.student_email}</p>
          </div>

          {/* Submission Info */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {t.assignments.submissionInfo}
            </h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t.assignments.submittedAt}: {formatDateTime(submission.submitted_at)}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">File: {submission.file_name}</p>
            {submission.is_late && (
              <Badge variant="warning" className="mt-2 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t.assignments.late}
              </Badge>
            )}
          </div>

          {/* Score Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t.assignments.enterScore.replace('{max}', maxScore.toString())}
            </label>
            <Input
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              min="0"
              max={maxScore}
              step="0.5"
              placeholder={`0 - ${maxScore}`}
            />
          </div>

          {/* Feedback Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t.assignments.enterFeedback}
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter feedback for the student..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={grading} className="gap-2">
            {grading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.common.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentDetail;
