import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ExternalLink, Plus, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  getPortalProductList,
  updatePortalProduct,
  addPortalProduct,
  submitPortalProductList,
  type PortalProductDto,
  type PortalProductListDto,
} from '@/api/productList'

// ── Add product form ──────────────────────────────────────────────────────────

function AddProductForm({
  projectId, onAdded,
}: {
  projectId: number
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [style, setStyle] = useState('')
  const [note, setNote] = useState('')

  const addMutation = useMutation({
    mutationFn: () => addPortalProduct(projectId, { name: name.trim(), style: style.trim() || undefined, customerNote: note.trim() || undefined }),
    onSuccess: () => {
      setName(''); setStyle(''); setNote(''); setOpen(false)
      onAdded()
      toast.success('Product added')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add product'),
  })

  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full mt-2">
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add a product not on the list
      </Button>
    )

  return (
    <div className="rounded-md border p-3 mt-2 space-y-3">
      <p className="text-sm font-medium">Add Unlisted Product</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Product Name *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pineapple Mead" autoFocus />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Style</Label>
          <Input value={style} onChange={e => setStyle(e.target.value)} placeholder="e.g. Traditional Mead" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Note (optional)</Label>
        <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Any notes..." />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={addMutation.isPending}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => { if (!name.trim()) { toast.error('Name is required'); return } addMutation.mutate() }}
          disabled={addMutation.isPending}
        >
          {addMutation.isPending ? 'Adding...' : 'Add Product'}
        </Button>
      </div>
    </div>
  )
}

// ── Product row ───────────────────────────────────────────────────────────────

function ProductRow({
  product, projectId, submitted,
}: {
  product: PortalProductDto
  projectId: number
  submitted: boolean
}) {
  const qc = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: (included: boolean) =>
      updatePortalProduct(projectId, product.id, { isIncluded: included, customerNote: product.customerNote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-product-list', projectId] }),
    onError: () => toast.error('Failed to update'),
  })

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 ${!product.isIncluded ? 'opacity-50' : ''}`}>
      {!submitted ? (
        <Switch
          checked={product.isIncluded}
          onCheckedChange={v => toggleMutation.mutate(v)}
          disabled={toggleMutation.isPending}
          className="shrink-0"
        />
      ) : (
        <div className={`w-9 h-5 rounded-full shrink-0 ${product.isIncluded ? 'bg-primary' : 'bg-muted'}`} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{product.name}</span>
          {product.isCustomerAdded && (
            <Badge variant="outline" className="text-xs px-1 py-0 border-purple-300 text-purple-700">Added by you</Badge>
          )}
        </div>
        {product.style && <p className="text-xs text-muted-foreground">{product.style}</p>}
        {product.customerNote && <p className="text-xs text-muted-foreground italic">{product.customerNote}</p>}
      </div>

      {product.sourceUrl && (
        <a
          href={product.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-blue-600 hover:text-blue-800"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function PortalProductListTab({ projectId }: { projectId: number }) {
  const qc = useQueryClient()

  const { data: list, isLoading } = useQuery<PortalProductListDto | null>({
    queryKey: ['portal-product-list', projectId],
    queryFn: () => getPortalProductList(projectId),
  })

  const submitMutation = useMutation({
    mutationFn: () => submitPortalProductList(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-product-list', projectId] })
      toast.success('Product list submitted')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Submit failed'),
  })

  if (isLoading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )

  if (!list)
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-sm text-muted-foreground">Your product list hasn't been set up yet. Check back soon.</p>
      </div>
    )

  const submitted = list.status === 'Submitted'
  const includedCount = list.products.filter(p => p.isIncluded).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">{list.title}</h2>
          {submitted ? (
            <p className="text-sm text-green-700">
              Submitted {list.submittedAt ? new Date(list.submittedAt).toLocaleDateString() : ''} — thank you!
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Review your product list below. Toggle products on or off, and add any missing items.
            </p>
          )}
        </div>
        {!submitted && (
          <Button
            size="sm"
            onClick={() => {
              if (includedCount === 0) { toast.error('At least one product must be included'); return }
              if (confirm(`Submit your product list with ${includedCount} products? This cannot be undone.`))
                submitMutation.mutate()
            }}
            disabled={submitMutation.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {submitMutation.isPending ? 'Submitting...' : `Submit List (${includedCount} products)`}
          </Button>
        )}
      </div>

      {/* Product list */}
      <div className="rounded-md border">
        {list.products.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No products in your list yet.</div>
        ) : (
          list.products.map(p => (
            <ProductRow key={p.id} product={p} projectId={projectId} submitted={submitted} />
          ))
        )}
      </div>

      {/* Add product */}
      {!submitted && (
        <AddProductForm
          projectId={projectId}
          onAdded={() => qc.invalidateQueries({ queryKey: ['portal-product-list', projectId] })}
        />
      )}
    </div>
  )
}
