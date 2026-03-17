import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, ArrowRight } from 'lucide-react'

const producerTypes = ['Brewery', 'Winery', 'Cidery', 'Distillery', 'Kombucha', 'Coffee', 'Soda', 'Other']

export default function Step1BusinessProfile() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [form, setForm] = useState({ companyName: '', contactName: '', contactEmail: '', phone: '' })

  function handleContinue() {
    navigate('/wizard/step/2')
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Step 1 of 7</span>
        </div>
        <h1 className="text-2xl font-semibold">Business Profile</h1>
        <p className="text-muted-foreground mt-1">
          Tell us about your company so we can tailor the catalog and settings to your operation.
        </p>
      </div>

      {/* Producer type selector */}
      <div className="space-y-3">
        <Label className="text-base font-medium">What do you produce?</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {producerTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-colors
                ${selectedType === type
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:bg-muted'
                }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Business info */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Brewing Co."
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Primary Contact</Label>
              <Input
                id="contactName"
                placeholder="Jane Smith"
                value={form.contactName}
                onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="jane@acmebrewing.com"
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedType && (
        <p className="text-sm text-muted-foreground">
          Producer type: <Badge variant="secondary">{selectedType}</Badge> — catalog will be filtered to match.
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleContinue} disabled={!selectedType || !form.companyName}>
          Save & Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
