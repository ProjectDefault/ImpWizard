import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  getFormDetail,
  getFormSubmission,
  saveFormDraft,
  submitForm,
  type FormFieldForFillDto,
} from '@/api/portal'

export default function PortalFormFillPage() {
  const { projectId, assignmentId } = useParams<{ projectId: string; assignmentId: string }>()
  const navigate = useNavigate()
  const pid = Number(projectId)
  const aid = Number(assignmentId)

  // answers keyed by fieldId
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['portal-form-detail', pid, aid],
    queryFn: () => getFormDetail(pid, aid),
    enabled: !!pid && !!aid,
  })

  const { data: submission, isLoading: subLoading } = useQuery({
    queryKey: ['portal-form-submission', pid, aid],
    queryFn: () => getFormSubmission(pid, aid),
    enabled: !!pid && !!aid,
    retry: false, // 404 is fine — no submission yet
  })

  // Pre-fill answers from existing submission
  useEffect(() => {
    if (submission?.answers) {
      const filled: Record<number, string> = {}
      for (const a of submission.answers) {
        filled[a.formFieldId] = a.value
      }
      setAnswers(filled)
    }
  }, [submission])

  const isReadOnly = submission?.status === 'Submitted'

  const answerArray = () =>
    Object.entries(answers).map(([fieldId, value]) => ({
      formFieldId: Number(fieldId),
      value,
    }))

  const saveDraftMutation = useMutation({
    mutationFn: () => saveFormDraft(pid, aid, answerArray()),
    onSuccess: () => toast.success('Draft saved.'),
    onError: () => toast.error('Failed to save draft.'),
  })

  const submitMutation = useMutation({
    mutationFn: () => submitForm(pid, aid, answerArray()),
    onSuccess: () => {
      toast.success('Form submitted successfully!')
      navigate(`/portal/${pid}`)
    },
    onError: () => toast.error('Failed to submit form.'),
  })

  function setAnswer(fieldId: number, value: string) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
  }

  function renderField(field: FormFieldForFillDto) {
    const value = answers[field.id] ?? ''

    if (isReadOnly) {
      return (
        <div className="text-sm bg-muted/40 rounded px-3 py-2 min-h-[36px]">
          {field.fieldType === 'Checkbox'
            ? (value === 'true' ? 'Yes' : 'No')
            : value || <span className="text-muted-foreground italic">No answer</span>}
        </div>
      )
    }

    switch (field.fieldType) {
      case 'Textarea':
        return (
          <Textarea
            value={value}
            onChange={e => setAnswer(field.id, e.target.value)}
            maxLength={field.maxLength ?? undefined}
            rows={3}
          />
        )
      case 'Number':
        return (
          <Input
            type="number"
            value={value}
            onChange={e => setAnswer(field.id, e.target.value)}
          />
        )
      case 'Date':
        return (
          <Input
            type="date"
            value={value}
            onChange={e => setAnswer(field.id, e.target.value)}
          />
        )
      case 'Checkbox':
        return (
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id={`field-${field.id}`}
              checked={value === 'true'}
              onCheckedChange={checked => setAnswer(field.id, checked ? 'true' : 'false')}
            />
            <label htmlFor={`field-${field.id}`} className="text-sm cursor-pointer">
              {field.label}
            </label>
          </div>
        )
      default: // Text, Dropdown
        return (
          <Input
            value={value}
            onChange={e => setAnswer(field.id, e.target.value)}
            maxLength={field.maxLength ?? undefined}
          />
        )
    }
  }

  const isLoading = formLoading || subLoading

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/portal/${pid}`)}
          className="gap-1 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !form ? (
        <div className="text-center text-muted-foreground py-12">Form not found.</div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold">{form.name}</h1>
              {isReadOnly && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Submitted
                </Badge>
              )}
            </div>
            {form.description && (
              <p className="text-sm text-muted-foreground mt-1">{form.description}</p>
            )}
            {submission?.submittedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Submitted {new Date(submission.submittedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <Separator className="mb-6" />

          <div className="space-y-6">
            {form.fields.map(field => (
              <div key={field.id} className="space-y-1.5">
                {field.fieldType !== 'Checkbox' && (
                  <Label className="text-sm font-medium">
                    {field.label}
                    {field.isRequired && <span className="text-destructive ml-1">*</span>}
                  </Label>
                )}
                {renderField(field)}
                {field.maxLength && field.fieldType !== 'Checkbox' && !isReadOnly && (
                  <p className="text-xs text-muted-foreground text-right">
                    {(answers[field.id] ?? '').length} / {field.maxLength}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!isReadOnly && (
            <>
              <Separator className="my-6" />
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => saveDraftMutation.mutate()}
                  disabled={saveDraftMutation.isPending || submitMutation.isPending}
                >
                  {saveDraftMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Draft
                </Button>
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={saveDraftMutation.isPending || submitMutation.isPending}
                >
                  {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
