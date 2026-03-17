import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowRight, ArrowLeft, Pencil, Check, X } from 'lucide-react'

interface StagedItem {
  id: number
  name: string
  category: string
  uom: string
  packSize: string
  source: 'catalog' | 'import'
}

const initialItems: StagedItem[] = [
  { id: 1, name: 'Cascade Hops (Pellet)', category: 'Ingredients', uom: 'LB', packSize: '1', source: 'catalog' },
  { id: 2, name: 'Pilsner Malt Base', category: 'Ingredients', uom: 'LB', packSize: '55', source: 'catalog' },
  { id: 3, name: 'US-05 Dry Yeast', category: 'Ingredients', uom: 'PKG', packSize: '1', source: 'catalog' },
  { id: 4, name: 'Imported Item A', category: '', uom: '', packSize: '', source: 'import' },
  { id: 5, name: '16 oz Can (Blank)', category: 'Packaging', uom: 'EA', packSize: '24', source: 'catalog' },
]

export default function Step5StagingReview() {
  const navigate = useNavigate()
  const [items, setItems] = useState<StagedItem[]>(initialItems)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<StagedItem>>({})

  function startEdit(item: StagedItem) {
    setEditingId(item.id)
    setEditValues({ name: item.name, category: item.category, uom: item.uom, packSize: item.packSize })
  }

  function saveEdit(id: number) {
    setItems(items.map(item => item.id === id ? { ...item, ...editValues } : item))
    setEditingId(null)
  }

  const issues = items.filter(i => !i.uom || !i.category).length

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground mb-2">Step 5 of 7</div>
        <h1 className="text-2xl font-semibold">Staging & Review</h1>
        <p className="text-muted-foreground mt-1">
          Review all items, edit inline, and assign missing UOMs and categories before validation.
        </p>
      </div>

      {issues > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <X className="h-4 w-4 shrink-0" />
          <span><strong>{issues}</strong> item{issues !== 1 ? 's' : ''} missing required fields (UOM or Category)</span>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Pack Size</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id} className={!item.uom || !item.category ? 'bg-destructive/5' : ''}>
                {editingId === item.id ? (
                  <>
                    <TableCell><Input value={editValues.name ?? ''} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} className="h-8" /></TableCell>
                    <TableCell><Input value={editValues.category ?? ''} onChange={e => setEditValues(v => ({ ...v, category: e.target.value }))} className="h-8" placeholder="e.g. Ingredients" /></TableCell>
                    <TableCell><Input value={editValues.uom ?? ''} onChange={e => setEditValues(v => ({ ...v, uom: e.target.value }))} className="h-8 w-20" placeholder="LB" /></TableCell>
                    <TableCell><Input value={editValues.packSize ?? ''} onChange={e => setEditValues(v => ({ ...v, packSize: e.target.value }))} className="h-8 w-20" /></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{item.source}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => saveEdit(item.id)}><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium text-sm">{item.name}</TableCell>
                    <TableCell className={!item.category ? 'text-destructive text-sm' : 'text-sm'}>{item.category || 'Required'}</TableCell>
                    <TableCell className={!item.uom ? 'text-destructive text-sm' : 'text-sm'}>{item.uom || 'Required'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.packSize || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{item.source}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => startEdit(item)}><Pencil className="h-3 w-3" /></Button></TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => navigate('/wizard/step/4')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={() => navigate('/wizard/step/6')}>
          Save & Continue <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
