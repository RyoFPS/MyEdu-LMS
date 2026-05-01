import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Avatar } from '../../components/ui/avatar';
import { useAuth } from '../../hooks/useAuth';
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
  Loader2,
  FileX,
  Target,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

const QuizResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isStudent, isTeacher, isAdmin } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [myAttempt, setMyAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);

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

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/quizzes/${id}/results`);
      const data = response.data.data || response.data;
      setQuiz(data.quiz || null);
      setAttempts(data.attempts || []);
      setMyAttempt(data.my_attempt || data.attempt || null);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <>
      <Header title="Quiz Results" description={quiz?.title || 'View quiz results'} />
      <div className="page-container max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/quizzes')} className="mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
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
                  {Math.round((myAttempt.score / Math.max(myAttempt.total_points, 1)) * 100)}% Score
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
                      {myAttempt.answers?.filter((a) => a.is_correct).length || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Correct</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {myAttempt.answers?.filter((a) => !a.is_correct).length || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Wrong</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {myAttempt.completed_at ? formatDateTime(myAttempt.completed_at) : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
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
                    Answer Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {myAttempt.answers.map((answer, index) => (
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
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            Q{index + 1}. {answer.question?.question || 'Question'}
                          </p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-gray-600 dark:text-gray-400">
                              Your answer:{' '}
                              <span className={cn('font-medium', answer.is_correct ? 'text-green-600' : 'text-red-600')}>
                                {answer.selected_answer?.toUpperCase()}
                              </span>
                            </p>
                            {!answer.is_correct && answer.question?.correct_answer && (
                              <p className="text-green-600">
                                Correct answer: <span className="font-medium">{answer.question.correct_answer.toUpperCase()}</span>
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
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileX className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No results yet</p>
              <p className="text-sm mt-1">You haven't taken this quiz yet</p>
              <Button className="mt-4" onClick={() => navigate(`/quizzes/${id}/take`)}>
                Take Quiz
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
                  Student Results
                </CardTitle>
                <Badge variant="secondary">{attempts.length} attempts</Badge>
                {(isAdmin || isTeacher) && (
                  <Button variant="outline" size="sm" onClick={handleExportQuiz}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            {attempts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileX className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">No attempts yet</p>
                <p className="text-sm mt-1">No students have taken this quiz</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => {
                    const percentage = Math.round(
                      (attempt.score / Math.max(attempt.total_points, 1)) * 100
                    );
                    return (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={attempt.student?.name || ''} src={attempt.student?.avatar} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {attempt.student?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-400">{attempt.student?.email}</p>
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
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDateTime(attempt.started_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {attempt.completed_at ? formatDateTime(attempt.completed_at) : 'In progress'}
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
