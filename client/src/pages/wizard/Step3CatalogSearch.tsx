import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ArrowLeft, Search, Plus, Check } from 'lucide-react'

const mockResults = [
  { id: 1, name: 'Cascade Hops (Pellet)', category: 'Ingredients', uom: 'LB' },
  { id: 2, name: 'Citra Hops (Pellet)', category: 'Ingredients', uom: 'LB' },
  { id: 3, name: 'Pilsner Malt Base', category: 'Ingredients', uom: 'LB' },
  { id: 4, name: 'Munich Malt', category: 'Ingredients', uom: 'LB' },
  { id: 5, name: 'US-05 Dry Yeast', category: 'Ingredients', uom: 'PKG' },
  { id: 6, name: 'Isinglass Finings', category: 'Additives', uom: 'GAL' },
  { id: 7, name: '16 oz Can (Blank)', category: 'Packaging', uom: 'EA' },
  { id: 8, name: 'CO2 Tank (20 lb)', category: 'Supplies', uom: 'EA' },
]

export default function Step3CatalogSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number[]>([])

  const results = query.length > 1
    ? mockResults.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    : mockResults

  function toggleItem(id: number) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground mb-2">Step 3 of 7</div>
        <h1 className="text-2xl font-semibold">Catalog Search</h1>
        <p className="text-muted-foreground mt-1">
          Search the catalog and select items to include in your implementation.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search 14,000+ catalog items…"
          className="pl-9"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary" />
          <span><strong>{selected.length}</strong> item{selected.length !== 1 ? 's' : ''} selected</span>
        </div>
      )}

      <div className="space-y-1">
        {results.map(item => {
          const isSelected = selected.includes(item.id)
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between px-4 py-3 rounded-md border cursor-pointer transition-colors
                ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              onClick={() => toggleItem(item.id)}
            >
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">{item.category}</Badge>
                  <span className="text-xs text-muted-foreground">UOM: {item.uom}</span>
                </div>
              </div>
              <Button
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className="shrink-0"
                onClick={e => { e.stopPropagation(); toggleItem(item.id) }}
              >
                {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {results.length} results. Connect the API to search the full catalog.
      </p>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => navigate('/wizard/step/2')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={() => navigate('/wizard/step/4')} disabled={selected.length === 0}>
          Save & Continue <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
