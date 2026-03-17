import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Download, FileSpreadsheet, CheckCircle2, PartyPopper } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const exportHistory = [
  { version: 1, filename: 'AcmeBrewing_2026-03-08_v1.xlsx', date: 'Mar 8, 2026', items: 4, size: '18 KB' },
]

export default function Step7Export() {
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
    }, 1800)
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground mb-2">Step 7 of 7</div>
        <h1 className="text-2xl font-semibold">Export</h1>
        <p className="text-muted-foreground mt-1">
          Generate your implementation spreadsheet. You can re-export at any time with the latest data.
        </p>
      </div>

      {/* Export card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-4">
            <FileSpreadsheet className="h-10 w-10 text-primary shrink-0 mt-1" />
            <div>
              <p className="font-medium">AcmeBrewing_{new Date().toISOString().slice(0, 10)}_v2.xlsx</p>
              <p className="text-sm text-muted-foreground mt-0.5">5 items • Import format • Generated on demand</p>
              <Badge variant="secondary" className="mt-2">Ready to generate</Badge>
            </div>
          </div>

          {generated ? (
            <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Export ready!</p>
                <p className="text-xs text-green-700 mt-0.5">Your file has been generated successfully.</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          ) : (
            <Button onClick={handleGenerate} disabled={generating} className="w-full sm:w-auto">
              {generating ? 'Generating…' : 'Generate Export'}
              <Download className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Celebration */}
      {generated && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-primary/5">
          <PartyPopper className="h-6 w-6 text-primary shrink-0" />
          <div>
            <p className="font-medium text-sm">Implementation complete!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share this file with your implementation team to complete your onboarding. You can return here anytime to re-export.
            </p>
          </div>
        </div>
      )}

      {/* Export history */}
      {exportHistory.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3">Export History</p>
          <div className="space-y-2">
            {exportHistory.map(e => (
              <div key={e.version} className="flex items-center justify-between px-4 py-3 rounded-md border text-sm">
                <div>
                  <p className="font-medium">{e.filename}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.date} · {e.items} items · {e.size}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">v{e.version}</Badge>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => navigate('/wizard/step/6')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    </div>
  )
}
