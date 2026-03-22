import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Package, Send, ExternalLink, AlertTriangle, Copy,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getProductListByProject, createProductList, updateProductList,
  toggleProduct, publishProductList,
  type ProductListDetailDto, type ProductDto,
} from '@/api/productList'
import { useQuery as useProjectsQuery } from '@tanstack/react-query'
import { getProjects } from '@/api/projects'

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'border-amber-300 text-amber-700',
    Published: 'border-blue-300 text-blue-700',
    Submitted: 'border-green-300 text-green-700',
  }
  return (
    <Badge variant="outline" className={`text-xs px-1.5 py-0 ${styles[status] ?? ''}`}>
      {status}
    </Badge>
  )
}

// ── Product row ───────────────────────────────────────────────────────────────

function ProductRow({
  product, listId, listStatus, onToggle,
}: {
  product: ProductDto
  listId: number
  listStatus: string
  onToggle: (productId: number, included: boolean) => void
}) {
  const isDuplicate = !!product.duplicateOfId
  const canEdit = listStatus !== 'Submitted'

  return (
    <div className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 ${
      isDuplicate ? 'opacity-50 bg-muted/30' : ''
    }`}>
      {canEdit ? (
        <Switch
          checked={product.isIncluded}
          onCheckedChange={v => onToggle(product.id, v)}
          disabled={isDuplicate}
          className="shrink-0"
        />
      ) : (
        <div className={`w-9 h-5 rounded-full shrink-0 ${product.isIncluded ? 'bg-primary' : 'bg-muted'}`} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{product.name}</span>
          {product.isCustomerAdded && (
            <Badge variant="outline" className="text-xs px-1 py-0 border-purple-300 text-purple-700">Customer Added</Badge>
          )}
          {isDuplicate && (
            <Badge variant="outline" className="text-xs px-1 py-0 border-orange-300 text-orange-700">
              <Copy className="h-2.5 w-2.5 mr-0.5" />
              Duplicate of {product.duplicateOfName}
            </Badge>
          )}
        </div>
        {product.style && (
          <p className="text-xs text-muted-foreground">{product.style}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
        {product.checkInCount > 0 && (
          <span>{product.checkInCount.toLocaleString()} check-ins</span>
        )}
        {product.lastActivityDate && (
          <span>{new Date(product.lastActivityDate).toLocaleDateString()}</span>
        )}
        {product.sourceUrl && (
          <a
            href={product.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Setup dialog ──────────────────────────────────────────────────────────────

function SetupDialog({
  projectId, existingList, open, onClose,
}: {
  projectId: number
  existingList: ProductListDetailDto | null
  open: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [title, setTitle] = useState(existingList?.title ?? 'Product List')

  const createMutation = useMutation({
    mutationFn: createProductList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-list', projectId] })
      toast.success('Product list created')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create product list'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: { id: number } & Parameters<typeof updateProductList>[1]) =>
      updateProductList(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-list', projectId] })
      toast.success('Settings saved')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }
    if (existingList) {
      updateMutation.mutate({ id: existingList.id, title: title.trim() })
    } else {
      createMutation.mutate({ projectId, title: title.trim() })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingList ? 'Edit Settings' : 'Set Up Product List'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>List Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Product List" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : existingList ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProductManagementPage() {
  const qc = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)

  const { data: projects = [], isLoading: projectsLoading } = useProjectsQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  })

  const { data: productList, isLoading: listLoading } = useQuery({
    queryKey: ['product-list', selectedProjectId],
    queryFn: () => getProductListByProject(selectedProjectId!),
    enabled: selectedProjectId !== null,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ listId, productId, included }: { listId: number; productId: number; included: boolean }) =>
      toggleProduct(listId, productId, included),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-list', selectedProjectId] }),
    onError: () => toast.error('Failed to update product'),
  })

  const publishMutation = useMutation({
    mutationFn: publishProductList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-list', selectedProjectId] })
      toast.success('Published to customer portal')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Publish failed'),
  })

  const includedProducts = productList?.products.filter(p => !p.duplicateOfId) ?? []
  const duplicateProducts = productList?.products.filter(p => !!p.duplicateOfId) ?? []
  const duplicateCount = duplicateProducts.length

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Product Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage producer product lists and publish them to the customer portal.
        </p>
      </div>

      <div className="space-y-4">

      {/* Project selector */}
      <div className="flex items-center gap-3">
        <div className="w-80">
          <Select
            value={selectedProjectId?.toString() ?? ''}
            onValueChange={v => setSelectedProjectId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder={projectsLoading ? 'Loading projects...' : 'Select a project...'} />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.customerName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProjectId !== null && (
          <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
            {productList ? 'Edit Settings' : 'Set Up Product List'}
          </Button>
        )}
      </div>

      {/* No project selected */}
      {selectedProjectId === null && (
        <div className="rounded-md border flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Select a project to manage its product list</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {selectedProjectId !== null && listLoading && (
        <div className="rounded-md border p-4 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {/* No list yet */}
      {selectedProjectId !== null && !listLoading && !productList && (
        <div className="rounded-md border flex items-center justify-center h-48">
          <div className="text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No product list configured for this project.</p>
            <Button size="sm" className="mt-3" onClick={() => setSetupOpen(true)}>
              Set Up Product List
            </Button>
          </div>
        </div>
      )}

      {/* List detail */}
      {productList && (
        <div className="rounded-md border">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{productList.title}</h2>
              <StatusBadge status={productList.status} />
              {productList.sourceUrl && (
                <a
                  href={productList.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  {productList.sourceUrl.replace('https://untappd.com/', '')}
                  <ExternalLink className="h-3 w-3 ml-0.5" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              {productList.status === 'Draft' && (productList.products?.length ?? 0) > 0 && (
                <Button
                  size="sm"
                  onClick={() => publishMutation.mutate(productList.id)}
                  disabled={publishMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {publishMutation.isPending ? 'Publishing...' : 'Publish to Portal'}
                </Button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          {productList.products.length > 0 && (
            <div className="px-4 py-2 bg-muted/30 border-b flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span>{includedProducts.filter(p => p.isIncluded).length} included</span>
              <span>{includedProducts.filter(p => !p.isIncluded).length} excluded</span>
              {duplicateCount > 0 && (
                <button
                  className="flex items-center gap-1 text-orange-600 hover:text-orange-800"
                  onClick={() => setShowDuplicates(v => !v)}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} auto-resolved
                  {showDuplicates ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
          )}

          {/* Product list */}
          {productList.products.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No products yet.
            </div>
          ) : (
            <div className="divide-y-0">
              {includedProducts.map(p => (
                <ProductRow
                  key={p.id}
                  product={p}
                  listId={productList.id}
                  listStatus={productList.status}
                  onToggle={(pid, included) =>
                    toggleMutation.mutate({ listId: productList.id, productId: pid, included })}
                />
              ))}

              {/* Duplicates section (collapsible) */}
              {showDuplicates && duplicateProducts.length > 0 && (
                <>
                  <div className="px-3 py-1.5 bg-orange-50 border-t border-b text-xs font-medium text-orange-700">
                    Auto-resolved duplicates — kept higher check-in count
                  </div>
                  {duplicateProducts.map(p => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      listId={productList.id}
                      listStatus={productList.status}
                      onToggle={(pid, included) =>
                        toggleMutation.mutate({ listId: productList.id, productId: pid, included })}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Setup dialog */}
      {setupOpen && selectedProjectId !== null && (
        <SetupDialog
          projectId={selectedProjectId}
          existingList={productList ?? null}
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
        />
      )}

      </div>
    </div>
  )
}
