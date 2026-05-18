import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Avatar } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { TableSkeleton } from '../../components/skeletons';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useQuizResults } from '../../hooks/useApi';
import api from '../../lib/axios';
import { cn, formatDateTime } from '../../lib/utils';
import type { Quiz, QuizAttempt } from '../../types';
import {
  BarChart3,
  ArrowLeft,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  FileX,
  Target,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

const QuizResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isStudent, isTeacher, isAdmin } = useAuth();
  const { t } = useTranslation();
  const { data: resultsData, isLoading: loading } = useQuizResults(id || '');
  const quiz = resultsData?.quiz || null;
  const attempts = resultsData?.attempts || [];
  const myAttempt = resultsData?.my_attempt || resultsData?.attempt || null;
  const stats = resultsData?.stats || null;

  const handleExportQuiz = async () => {
    try {
      const response = await api.get(`/quizzes/${id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quiz-results-${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded!');
    } catch {
      toast.error('Failed to export.');
    }
  };

  if (loading) {
    return (
      <>
        <Header title={t.quizzes.quizResults} />
        <div className="page-container max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          
          <Card className="mb-6">
            <div className="gradient-primary p-8 text-center">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-3 bg-white/20" />
              <Skeleton className="h-10 w-32 mx-auto mb-2 bg-white/20" />
              <Skeleton className="h-4 w-24 mx-auto bg-white/20" />
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <TableSkeleton rows={5} columns={6} />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={t.quizzes.quizResults} description={quiz?.title || t.quizzes.quizResults} />
      <div className="page-container max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/quizzes')} className="mb-2">
          <ArrowLeft className="h-4 w-4" />
          {t.quizzes.backToQuizzes}
        </Button>

        {/* Student View - My Results */}
        {isStudent && myAttempt && (
          <>
            {/* Score Card */}
            <Card className="overflow-hidden">
              <div className="gradient-primary p-8 text-white text-center">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-90" />
                <h2 className="text-4xl font-bold mb-1">
                  {myAttempt.score}/{myAttempt.total_points}
                </h2>
                <p className="text-white/80 text-sm">
                  {Math.round((myAttempt.score / Math.max(myAttempt.total_points, 1)) * 100)}% {t.quizzes.score}
                </p>
                <div className="mt-4 max-w-xs mx-auto">
                  <Progress
                    value={myAttempt.score}
                    max={myAttempt.total_points}
                    size="lg"
                    className="[&_div]:bg-white/30 [&_div_div]:bg-white"
                  />
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {myAttempt.answers?.filter((a: any) => a.is_correct).length || 0}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.quizzes.correct}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {myAttempt.answers?.filter((a: any) => !a.is_correct).length || 0}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.quizzes.incorrect}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
                      {myAttempt.completed_at ? formatDateTime(myAttempt.completed_at) : 'N/A'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.quizzes.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Answer Review */}
            {myAttempt.answers && myAttempt.answers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary-500" />
                    {t.quizzes.myResult}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {myAttempt.answers.map((answer: any, index: number) => (
                    <div
                      key={answer.id}
                      className={cn(
                        'p-4 rounded-lg border-2',
                        answer.is_correct
                          ? 'border-green-200 bg-green-50/50'
                          : 'border-red-200 bg-red-50/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex items-center justify-center h-6 w-6 rounded-full shrink-0 mt-0.5',
                            answer.is_correct ? 'bg-green-500' : 'bg-red-500'
                          )}
                        >
                          {answer.is_correct ? (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          ) : (
                            <XCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                            Q{index + 1}. {answer.question?.question || t.quizzes.question}
                          </p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-zinc-600 dark:text-zinc-400">
                              {t.quizzes.yourAnswer}:{' '}
                              <span className={cn('font-medium', answer.is_correct ? 'text-green-600' : 'text-red-600')}>
                                {answer.selected_answer?.toUpperCase()}
                              </span>
                            </p>
                            {!answer.is_correct && answer.question?.correct_answer && (
                              <p className="text-green-600">
                                {t.quizzes.correctAnswerLabel}: <span className="font-medium">{answer.question.correct_answer.toUpperCase()}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={answer.is_correct ? 'success' : 'destructive'}>
                          {answer.question?.points || 0} pts
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Student View - No attempt */}
        {isStudent && !myAttempt && (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <FileX className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">{t.quizzes.noResults}</p>
              <p className="text-sm mt-1">{t.quizzes.noResultsHint}</p>
              <Button className="mt-4" onClick={() => navigate(`/quizzes/${id}/take`)}>
                {t.quizzes.takeQuiz}
              </Button>
            </div>
          </Card>
        )}

        {/* Teacher/Admin View - All Attempts */}
        {(isTeacher || isAdmin) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary-500" />
                  {t.quizzes.studentResults}
                </CardTitle>
                <Badge variant="secondary">{attempts.length} {t.quizzes.attempts}</Badge>
                {(isAdmin || isTeacher) && (
                  <Button variant="outline" size="sm" onClick={handleExportQuiz}>
                    <Download className="h-4 w-4" />
                    {t.quizzes.exportCsv}
                  </Button>
                )}
              </div>
            </CardHeader>
            {attempts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <FileX className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">{t.quizzes.noResults}</p>
                <p className="text-sm mt-1">{t.quizzes.noResultsHint}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.quizzes.student}</TableHead>
                    <TableHead>{t.quizzes.score}</TableHead>
                    <TableHead>{t.quizzes.percentage}</TableHead>
                    <TableHead>{t.quizzes.startedAt}</TableHead>
                    <TableHead>{t.quizzes.completedAt}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt: any) => {
                    const percentage = Math.round(
                      (attempt.score / Math.max(attempt.total_points, 1)) * 100
                    );
                    return (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={attempt.student?.name || ''} src={attempt.student?.avatar} size="sm" />
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {attempt.student?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-zinc-400">{attempt.student?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {attempt.score}/{attempt.total_points}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={percentage} size="sm" className="w-20" />
                            <span className="text-sm font-medium">{percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDateTime(attempt.started_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {attempt.completed_at ? formatDateTime(attempt.completed_at) : t.quizzes.notCompleted}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              percentage >= 80
                                ? 'success'
                                : percentage >= 60
                                ? 'warning'
                                : 'destructive'
                            }
                          >
                            {percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        )}
      </div>
    </>
  );
};

export default QuizResults;
