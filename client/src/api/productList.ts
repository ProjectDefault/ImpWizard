import api from './client'

export interface ProductListSummaryDto {
  id: number
  projectId: number
  title: string
  sourceType: string
  sourceUrl?: string
  rollingWindowDays: number
  status: 'Draft' | 'Published' | 'Submitted'
  lastScrapedAt?: string
  publishedAt?: string
  submittedAt?: string
  productCount: number
}

export interface ProductDto {
  id: number
  name: string
  style?: string
  sourceUrl?: string
  lastActivityDate?: string
  checkInCount: number
  isIncluded: boolean
  isCustomerAdded: boolean
  duplicateOfId?: number
  duplicateOfName?: string
  customerNote?: string
}

export interface ProductListDetailDto {
  id: number
  projectId: number
  title: string
  sourceType: string
  sourceUrl?: string
  rollingWindowDays: number
  status: 'Draft' | 'Published' | 'Submitted'
  lastScrapedAt?: string
  publishedAt?: string
  submittedAt?: string
  products: ProductDto[]
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

export const getProductListByProject = (projectId: number): Promise<ProductListDetailDto | null> =>
  api.get(`/producer-product-lists/by-project/${projectId}`).then(r => r.data)

export const getProductList = (id: number): Promise<ProductListDetailDto> =>
  api.get(`/producer-product-lists/${id}`).then(r => r.data)

export const createProductList = (data: {
  projectId: number
  title: string
  sourceUrl?: string
  rollingWindowDays?: number
}): Promise<ProductListDetailDto> =>
  api.post('/producer-product-lists', data).then(r => r.data)

export const updateProductList = (id: number, data: {
  title?: string
  sourceUrl?: string
  rollingWindowDays?: number
}): Promise<ProductListDetailDto> =>
  api.put(`/producer-product-lists/${id}`, data).then(r => r.data)

export const toggleProduct = (listId: number, productId: number, isIncluded: boolean): Promise<ProductDto> =>
  api.patch(`/producer-product-lists/${listId}/products/${productId}/toggle`, { isIncluded }).then(r => r.data)

export const publishProductList = (id: number): Promise<ProductListDetailDto> =>
  api.post(`/producer-product-lists/${id}/publish`).then(r => r.data)

export const deleteProductList = (id: number): Promise<void> =>
  api.delete(`/producer-product-lists/${id}`)

// ── Portal (customer) endpoints ───────────────────────────────────────────────

export interface PortalProductDto {
  id: number
  name: string
  style?: string
  sourceUrl?: string
  isIncluded: boolean
  isCustomerAdded: boolean
  customerNote?: string
}

export interface PortalProductListDto {
  id: number
  title: string
  status: 'Published' | 'Submitted'
  publishedAt?: string
  submittedAt?: string
  products: PortalProductDto[]
}

export const getPortalProductList = (projectId: number): Promise<PortalProductListDto | null> =>
  api.get(`/portal/product-list/${projectId}`).then(r => r.data)

export const updatePortalProduct = (projectId: number, productId: number, data: {
  isIncluded: boolean
  customerNote?: string
}): Promise<void> =>
  api.patch(`/portal/product-list/${projectId}/products/${productId}`, data)

export const addPortalProduct = (projectId: number, data: {
  name: string
  style?: string
  customerNote?: string
}): Promise<PortalProductDto> =>
  api.post(`/portal/product-list/${projectId}/products`, data).then(r => r.data)

export const submitPortalProductList = (projectId: number): Promise<void> =>
  api.post(`/portal/product-list/${projectId}/submit`)
