import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import ProtectedRoute from '@/components/shared/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'

import AdminLayout from '@/components/layout/AdminLayout'
import DashboardPage from '@/pages/admin/DashboardPage'
import ProjectsPage from '@/pages/admin/ProjectsPage'
import CatalogPage from '@/pages/admin/CatalogPage'
import ReferenceDataPage from '@/pages/admin/ReferenceDataPage'
import CategoriesPage from '@/pages/admin/CategoriesPage'
import ProductTypesPage from '@/pages/admin/ProductTypesPage'
import UnitsOfMeasurePage from '@/pages/admin/UnitsOfMeasurePage'
import JourneysPage from '@/pages/admin/JourneysPage'
import JourneyEditorPage from '@/pages/admin/JourneyEditorPage'
import JourneyStagesCategoriesPage from '@/pages/admin/JourneyStagesCategoriesPage'
import MeetingCatalogPage from '@/pages/admin/MeetingCatalogPage'
import ResourceCatalogPage from '@/pages/admin/ResourceCatalogPage'
import MeetingTypesPage from '@/pages/admin/MeetingTypesPage'
import ResourceTypesPage from '@/pages/admin/ResourceTypesPage'
import ProgramsPage from '@/pages/admin/ProgramsPage'
import ImplementationTypesPage from '@/pages/admin/ImplementationTypesPage'
import FormsPage from '@/pages/admin/FormsPage'
import FormEditorPage from '@/pages/admin/FormEditorPage'
import ImportTemplatesPage from '@/pages/admin/ImportTemplatesPage'
import FormImpactReviewPage from '@/pages/admin/FormImpactReviewPage'
import UsersPage from '@/pages/admin/UsersPage'
import AuditLogPage from '@/pages/admin/AuditLogPage'
import ItemCategoriesPage from '@/pages/admin/ItemCategoriesPage'
import ProjectDetailPage from '@/pages/admin/ProjectDetailPage'
import BulkSubmissionReviewPage from '@/pages/admin/BulkSubmissionReviewPage'
import ProductManagementPage from '@/pages/admin/ProductManagementPage'
import PackagingPage from '@/pages/admin/PackagingPage'
import ProfilePage from '@/pages/shared/ProfilePage'

import SuperCustomerLayout from '@/components/layout/SuperCustomerLayout'
import SuperCustomerDashboard from '@/pages/SuperCustomerDashboard'

import ProjectPortalLayout from '@/components/layout/ProjectPortalLayout'
import PortalProjectListPage from '@/pages/portal/PortalProjectListPage'
import PortalProjectPage from '@/pages/portal/PortalProjectPage'
import PortalFormFillPage from '@/pages/portal/PortalFormFillPage'

import WizardLayout from '@/components/layout/WizardLayout'
import Step1BusinessProfile from '@/pages/wizard/Step1BusinessProfile'
import Step2Preferences from '@/pages/wizard/Step2Preferences'
import Step3CatalogSearch from '@/pages/wizard/Step3CatalogSearch'
import Step4FlexibleImport from '@/pages/wizard/Step4FlexibleImport'
import Step5StagingReview from '@/pages/wizard/Step5StagingReview'
import Step6Validation from '@/pages/wizard/Step6Validation'
import Step7Export from '@/pages/wizard/Step7Export'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Admin + CIS routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['Admin', 'CIS']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="projects/:projectId/bulk-review/:faid" element={<BulkSubmissionReviewPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="data/reference" element={<ReferenceDataPage />} />
              <Route path="data/categories" element={<CategoriesPage />} />
              <Route path="data/product-types" element={<ProductTypesPage />} />
              <Route path="data/units-of-measure" element={<UnitsOfMeasurePage />} />
              <Route path="journeys" element={<JourneysPage />} />
              <Route path="journeys/stage-categories" element={<JourneyStagesCategoriesPage />} />
              <Route path="journeys/product-management" element={<ProductManagementPage />} />
              <Route path="catalog/meetings" element={<MeetingCatalogPage />} />
              <Route path="catalog/resources" element={<ResourceCatalogPage />} />
              <Route path="catalog/meeting-types" element={<MeetingTypesPage />} />
              <Route path="catalog/resource-types" element={<ResourceTypesPage />} />
              <Route path="journeys/:journeyId" element={<JourneyEditorPage />} />
              <Route path="settings/programs" element={<ProgramsPage />} />
              <Route path="settings/implementation-types" element={<ImplementationTypesPage />} />
              <Route path="settings/forms" element={<FormsPage />} />
              <Route path="settings/forms/:formId/edit" element={<FormEditorPage />} />
              <Route path="settings/import-templates" element={<ImportTemplatesPage />} />
              <Route path="settings/form-change-review" element={<FormImpactReviewPage />} />
              <Route path="catalog/ingredient-categories" element={<ItemCategoriesPage />} />
              <Route path="catalog/packaging" element={<PackagingPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="audit" element={<AuditLogPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* SuperCustomer light dashboard — legacy, kept for reference */}
            <Route
              path="/my-project"
              element={<Navigate to="/portal" replace />}
            />

            {/* Customer / SuperCustomer / Admin / CIS Portal */}
            <Route
              path="/portal"
              element={
                <ProtectedRoute roles={['Admin', 'CIS', 'SuperCustomer', 'Customer']}>
                  <ProjectPortalLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PortalProjectListPage />} />
              <Route path=":projectId" element={<PortalProjectPage />} />
              <Route path=":projectId/forms/:assignmentId" element={<PortalFormFillPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Wizard — all roles can access */}
            <Route
              path="/wizard"
              element={
                <ProtectedRoute roles={['Customer', 'SuperCustomer', 'Admin', 'CIS']}>
                  <WizardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/wizard/step/1" replace />} />
              <Route path="step/1" element={<Step1BusinessProfile />} />
              <Route path="step/2" element={<Step2Preferences />} />
              <Route path="step/3" element={<Step3CatalogSearch />} />
              <Route path="step/4" element={<Step4FlexibleImport />} />
              <Route path="step/5" element={<Step5StagingReview />} />
              <Route path="step/6" element={<Step6Validation />} />
              <Route path="step/7" element={<Step7Export />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
