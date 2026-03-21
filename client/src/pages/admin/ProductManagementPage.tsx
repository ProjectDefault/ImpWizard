import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Package, RefreshCw, Send, ExternalLink, AlertTriangle, Copy,
  ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getProductListByProject, createProductList, updateProductList,
  scrapeAndSave, toggleProduct, publishProductList,
  type ProductListDetailDto, type ProductDto, type ScrapedProductDto,
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
  const [url, setUrl] = useState(existingList?.sourceUrl ?? '')
  const [days, setDays] = useState(String(existingList?.rollingWindowDays ?? 730))

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
    if (!url.trim()) { toast.error('Untappd URL is required'); return }
    if (existingList) {
      updateMutation.mutate({ id: existingList.id, title: title.trim(), sourceUrl: url.trim(), rollingWindowDays: Number(days) || 730 })
    } else {
      createMutation.mutate({ projectId, title: title.trim(), sourceUrl: url.trim(), rollingWindowDays: Number(days) || 730 })
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
          <div className="space-y-1.5">
            <Label>Untappd Brewery URL <span className="text-destructive">*</span></Label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://untappd.com/BreweryName"
            />
            <p className="text-xs text-muted-foreground">
              e.g. https://untappd.com/MortalisBrewingCompany
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Activity Filter — Rolling Window</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
                <SelectItem value="1095">3 years</SelectItem>
                <SelectItem value="1825">5 years</SelectItem>
                <SelectItem value="0">No filter</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Products with no activity in this window will be excluded at scrape time.
            </p>
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

const WINDOW_OPTIONS = [
  { value: '365', label: '1 year' },
  { value: '730', label: '2 years' },
  { value: '1095', label: '3 years' },
  { value: '1825', label: '5 years' },
  { value: '0', label: 'No filter' },
]

// ── Scraper preview ───────────────────────────────────────────────────────────

function ScraperPreview() {
  const [url, setUrl] = useState('')
  const [days, setDays] = useState('730')
  const [results, setResults] = useState<ScrapedProductDto[] | null>(null)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [progressLog, setProgressLog] = useState<string[]>([])
  const abortRef = useState<AbortController | null>(null)

  async function runScrape() {
    if (!url.trim()) return
    const abort = new AbortController()
    abortRef[1](abort)
    setIsRunning(true)
    setResults(null)
    setProgressLog([])
    setShowDuplicates(false)

    const token = (await import('@/store/authStore')).useAuthStore.getState().token
    const params = new URLSearchParams({ url: url.trim(), rollingWindowDays: days })

    try {
      const response = await fetch(`/api/producer-product-lists/scrape-stream?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abort.signal,
      })
      if (!response.ok || !response.body) {
        toast.error('Scrape request failed')
        setIsRunning(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6)) as { type: string; payload: string }
          if (event.type === 'progress') {
            const msg = JSON.parse(event.payload) as string
            setProgressLog(prev => [...prev, msg])
          } else if (event.type === 'complete') {
            const products = JSON.parse(event.payload) as ScrapedProductDto[]
            setResults(products)
          } else if (event.type === 'error') {
            toast.error(JSON.parse(event.payload) as string)
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Scrape failed')
    } finally {
      setIsRunning(false)
      abortRef[1](null)
    }
  }

  const main = results?.filter(r => !r.isDuplicate) ?? []
  const dupes = results?.filter(r => r.isDuplicate) ?? []

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 space-y-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-64 space-y-1.5">
            <Label>Untappd Brewery URL</Label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://untappd.com/BreweryName"
              onKeyDown={e => { if (e.key === 'Enter' && url.trim() && !isRunning) runScrape() }}
            />
          </div>
          <div className="w-40 space-y-1.5">
            <Label>Activity Window</Label>
            <Select value={days} onValueChange={setDays} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue>
                  {WINDOW_OPTIONS.find(o => o.value === days)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {WINDOW_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => isRunning ? abortRef[0]?.abort() : runScrape()}
            disabled={!url.trim() && !isRunning}
            variant={isRunning ? 'outline' : 'default'}
          >
            <Search className={`h-4 w-4 mr-1.5 ${isRunning ? 'animate-pulse' : ''}`} />
            {isRunning ? 'Cancel' : 'Scrape'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Results are not saved — use this to preview a brewery's product list before attaching it to a project.
        </p>
      </div>

      {isRunning && (
        <div className="rounded-md border p-3 bg-muted/20 space-y-1 font-mono text-xs text-muted-foreground">
          {progressLog.length === 0
            ? <span className="animate-pulse">Connecting...</span>
            : progressLog.map((msg, i) => (
              <div key={i} className={i === progressLog.length - 1 ? 'text-foreground' : ''}>
                {i === progressLog.length - 1 ? '→ ' : '✓ '}{msg}
              </div>
            ))
          }
        </div>
      )}

      {results && !isPending && (
        <div className="rounded-md border">
          <div className="px-4 py-2 bg-muted/30 border-b flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">{main.length} products</span>
            {dupes.length > 0 && (
              <button
                className="flex items-center gap-1 text-orange-600 hover:text-orange-800"
                onClick={() => setShowDuplicates(v => !v)}
              >
                <AlertTriangle className="h-3 w-3" />
                {dupes.length} duplicate{dupes.length !== 1 ? 's' : ''} auto-resolved
                {showDuplicates ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>

          {main.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No products found.</p>
          ) : (
            <div>
              {main.map((p, i) => (
                <PreviewRow key={i} product={p} />
              ))}
              {showDuplicates && dupes.length > 0 && (
                <>
                  <div className="px-3 py-1.5 bg-orange-50 border-t border-b text-xs font-medium text-orange-700">
                    Auto-resolved duplicates — kept higher check-in count
                  </div>
                  {dupes.map((p, i) => (
                    <PreviewRow key={`dup-${i}`} product={p} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PreviewRow({ product }: { product: ScrapedProductDto }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 ${product.isDuplicate ? 'opacity-50 bg-muted/20' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{product.name}</span>
          {product.isDuplicate && (
            <Badge variant="outline" className="text-xs px-1 py-0 border-orange-300 text-orange-700">
              <Copy className="h-2.5 w-2.5 mr-0.5" />
              Duplicate of {product.duplicateOfName}
            </Badge>
          )}
        </div>
        {product.style && <p className="text-xs text-muted-foreground">{product.style}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
        {product.checkInCount > 0 && <span>{product.checkInCount.toLocaleString()} check-ins</span>}
        {product.lastActivityDate && (
          <span>{new Date(product.lastActivityDate).toLocaleDateString()}</span>
        )}
        {product.sourceUrl && (
          <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800">
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
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

  const scrapeMutation = useMutation({
    mutationFn: (id: number) => scrapeAndSave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-list', selectedProjectId] })
      toast.success('Scrape complete')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Scrape failed'),
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
          Scrape and manage producer product lists from Untappd, then publish them to the customer portal.
        </p>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Project Lists</TabsTrigger>
          <TabsTrigger value="preview">Scraper Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <ScraperPreview />
        </TabsContent>

        <TabsContent value="projects" className="mt-4 space-y-4">

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
              {productList.lastScrapedAt && (
                <span className="text-xs text-muted-foreground">
                  Last scraped {new Date(productList.lastScrapedAt).toLocaleDateString()}
                </span>
              )}
              {productList.status !== 'Submitted' && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => scrapeMutation.mutate(productList.id)}
                  disabled={scrapeMutation.isPending || !productList.sourceUrl}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
                  {scrapeMutation.isPending ? 'Scraping...' : productList.lastScrapedAt ? 'Re-scrape' : 'Scrape Now'}
                </Button>
              )}
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
              No products yet. Click "Scrape Now" to fetch from Untappd.
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

        </TabsContent>
      </Tabs>
    </div>
  )
}
