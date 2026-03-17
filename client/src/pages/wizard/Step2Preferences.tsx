import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ArrowLeft, Plus, X } from 'lucide-react'

export default function Step2Preferences() {
  const navigate = useNavigate()
  const [units, setUnits] = useState(['Main Facility'])
  const [locations, setLocations] = useState(['Cold Storage', 'Dry Storage'])
  const [newUnit, setNewUnit] = useState('')
  const [newLocation, setNewLocation] = useState('')

  function addItem(list: string[], setter: (v: string[]) => void, value: string, clear: () => void) {
    if (value.trim()) {
      setter([...list, value.trim()])
      clear()
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground mb-2">Step 2 of 7</div>
        <h1 className="text-2xl font-semibold">Preferences</h1>
        <p className="text-muted-foreground mt-1">
          Configure your business units, storage locations, and operational settings.
        </p>
      </div>

      <div className="grid gap-4">
        {/* Business Units */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Business Units</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {units.map(u => (
                <Badge key={u} variant="secondary" className="flex items-center gap-1 pl-3">
                  {u}
                  <button onClick={() => setUnits(units.filter(x => x !== u))} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add business unit…"
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem(units, setUnits, newUnit, () => setNewUnit(''))}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={() => addItem(units, setUnits, newUnit, () => setNewUnit(''))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Storage Locations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Storage Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {locations.map(l => (
                <Badge key={l} variant="secondary" className="flex items-center gap-1 pl-3">
                  {l}
                  <button onClick={() => setLocations(locations.filter(x => x !== l))} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add storage location…"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem(locations, setLocations, newLocation, () => setNewLocation(''))}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={() => addItem(locations, setLocations, newLocation, () => setNewLocation(''))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* UOM label */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Default Unit of Measure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="defaultUom">Default UOM</Label>
              <Input id="defaultUom" placeholder="e.g. LB, KG, GAL…" defaultValue="LB" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => navigate('/wizard/step/1')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={() => navigate('/wizard/step/3')}>
          Save & Continue <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
