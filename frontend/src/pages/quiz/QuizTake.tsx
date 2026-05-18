import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { useQuiz } from '../../hooks/useApi';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import type { Quiz, QuizQuestion } from '../../types';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  FileX,
} from 'lucide-react';

const QuizTake: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: quiz, isLoading: loading } = useQuiz(id || '');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const startQuiz = async () => {
      if (!id || attemptStarted) return;
      
      try {
        // Start attempt
        const response = await api.post(`/quizzes/${id}/start`);
        const data = response.data.data;
        setQuestions(data.questions || []);
        setAttemptId(data.attempt_id);
        setTimeLeft((data.duration_minutes || 30) * 60);
        setAttemptStarted(true);

        // Start timer
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string }; status?: number } };
        if (error.response?.status === 409) {
          toast.error('You have already taken this quiz');
        } else {
          toast.error(error.response?.data?.message || 'Failed to start quiz');
        }
        navigate('/quizzes');
      }
    };

    startQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, navigate, attemptStarted]);

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (submitting) return;
      setSubmitting(true);
      setShowConfirm(false);

      if (timerRef.current) clearInterval(timerRef.current);

      try {
        const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
          quiz_question_id: Number(questionId),
          selected_answer: answer,
        }));

        await api.post(`/quizzes/${id}/submit`, {
          attempt_id: attemptId,
          answers: formattedAnswers,
        });

        if (autoSubmit) {
          toast(t.quizzes.timeUp, { icon: '⏰' });
        } else {
          toast.success(t.quizzes.quizSubmitted);
        }
        navigate(`/quizzes/${id}/results`);
      } catch {
        toast.error('Failed to submit quiz');
        setSubmitting(false);
      }
    },
    [answers, attemptId, id, navigate, submitting, t]
  );

  useEffect(() => {
    if (timeLeft <= 0 && quiz && attemptId) {
      handleSubmit(true);
    }
  }, [timeLeft, quiz, attemptId, handleSubmit]);

  const selectAnswer = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <>
        <Header title={t.sidebar.quizzes} />
        <div className="page-container max-w-3xl mx-auto">
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <>
        <Header title={t.sidebar.quizzes} />
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <FileX className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">{t.quizzes.quizNotAvailable}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/quizzes')}>
              {t.quizzes.backToQuizzes}
            </Button>
          </div>
        </div>
      </>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isTimeLow = timeLeft < 60;

  return (
    <>
      <Header title={quiz.title} description={quiz.description || undefined} />
      <div className="page-container max-w-4xl mx-auto">
        {/* Timer & Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <Badge variant="secondary">
                  {t.quizzes.question} {currentIndex + 1} {t.quizzes.questionOf} {questions.length}
                </Badge>
                <Badge variant={answeredCount === questions.length ? 'success' : 'warning'}>
                  {answeredCount}/{questions.length} {t.quizzes.answeredCount}
                </Badge>
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-lg font-bold',
                  isTimeLow
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 animate-pulse'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                )}
              >
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
            </div>
            <Progress value={answeredCount} max={questions.length} size="sm" />
          </CardContent>
        </Card>

        {/* Question Navigation */}
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <button
              key={q.id || i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200',
                i === currentIndex
                  ? 'bg-primary-500 text-white shadow-md'
                  : answers[q.id!]
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 border border-green-200'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Current Question */}
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{currentQuestion.points} {t.quizzes.points}</Badge>
              {answers[currentQuestion.id] && (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t.quizzes.answeredCount}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg mt-2">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['a', 'b', 'c', 'd'] as const).map((option) => {
              const isSelected = answers[currentQuestion.id!] === option;
              return (
                <button
                  key={option}
                  onClick={() => selectAnswer(currentQuestion.id!, option)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200',
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700'
                      : 'border-zinc-200 dark:border-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold shrink-0 transition-colors',
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    {option.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">
                    {currentQuestion[`option_${option}`]}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            {t.quizzes.previous}
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button onClick={() => setShowConfirm(true)} disabled={submitting}>
              <Send className="h-4 w-4" />
              {t.quizzes.submitQuiz}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            >
              {t.quizzes.next}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Submit Confirmation */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent onClose={() => setShowConfirm(false)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t.quizzes.submitConfirm}
              </DialogTitle>
              <DialogDescription>
                {answeredCount < questions.length ? (
                  <span className="text-amber-600">
                    {answeredCount}/{questions.length} {t.quizzes.answeredCount}. {questions.length - answeredCount} {t.quizzes.unanswered}.
                  </span>
                ) : (
                  <span>
                    {t.quizzes.submitConfirmDesc}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={() => handleSubmit(false)} isLoading={submitting}>
                <Send className="h-4 w-4" />
                {t.quizzes.submitQuiz}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default QuizTake;
