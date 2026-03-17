import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

const rules = [
  { id: 1, label: 'At least one item selected', status: 'pass', detail: '5 items in project' },
  { id: 2, label: 'All items have a UOM assigned', status: 'fail', detail: '1 item missing UOM — go back to Step 5' },
  { id: 3, label: 'All items have a category', status: 'fail', detail: '1 item missing category — go back to Step 5' },
  { id: 4, label: 'No duplicate item names', status: 'pass', detail: 'No duplicates found' },
  { id: 5, label: 'Business profile complete', status: 'pass', detail: 'Company name and producer type set' },
]

const icons = {
  pass: <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />,
  fail: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
  warn: <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />,
}

export default function Step6Validation() {
  const navigate = useNavigate()
  const passing = rules.filter(r => r.status === 'pass').length
  const failing = rules.filter(r => r.status === 'fail').length
  const allPassed = failing === 0

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground mb-2">Step 6 of 7</div>
        <h1 className="text-2xl font-semibold">Validation</h1>
        <p className="text-muted-foreground mt-1">
          We're checking your data is complete and ready for export.
        </p>
      </div>

      {/* Summary */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${allPassed ? 'bg-green-50 border-green-200' : 'bg-destructive/10 border-destructive/20'}`}>
        {allPassed
          ? <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
          : <XCircle className="h-6 w-6 text-destructive shrink-0" />
        }
        <div>
          <p className="font-medium text-sm">
            {allPassed ? 'All checks passed — ready to export!' : `${failing} issue${failing !== 1 ? 's' : ''} need attention`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{passing}/{rules.length} checks passing</p>
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-start gap-3 px-4 py-3 rounded-md border">
            {icons[rule.status as keyof typeof icons]}
            <div>
              <p className="text-sm font-medium">{rule.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{rule.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => navigate('/wizard/step/5')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={() => navigate('/wizard/step/7')} disabled={!allPassed} variant={allPassed ? 'default' : 'secondary'}>
          {allPassed ? 'Proceed to Export' : 'Fix Issues First'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
