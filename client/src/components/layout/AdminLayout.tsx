import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  FolderKanban,
  Database,
  Package,
  BookOpen,
  Tag,
  Layers,
  Ruler,
  Map,
  Users,
  ScrollText,
  Settings,
  Workflow,
  LogOut,
  User,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  FileSpreadsheet,
  AlertCircle,
  LayoutGrid,
  ShoppingBasket,
  Calendar,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const topNavItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban, end: false },
]

const journeyItems = [
  { to: '/admin/journeys', label: 'Journeys', icon: Map },
  { to: '/admin/journeys/stage-categories', label: 'Stage Categories', icon: Tag },
  { to: '/admin/journeys/product-management', label: 'Product Management', icon: Package },
]

const catalogItems = [
  { to: '/admin/catalog', label: 'Item Catalog', icon: Package },
  { to: '/admin/catalog/ingredient-categories', label: 'Ingredient Categories', icon: Tag },
  { to: '/admin/catalog/ingredient-types', label: 'Ingredient Types', icon: Tag },
  { to: '/admin/catalog/packaging', label: 'Packaging Types', icon: Tag },
  { to: '/admin/catalog/meetings', label: 'Meeting Catalog', icon: Calendar },
  { to: '/admin/catalog/meeting-types', label: 'Meeting Types', icon: Tag },
  { to: '/admin/catalog/resources', label: 'Resource Catalog', icon: FileText },
  { to: '/admin/catalog/resource-types', label: 'Resource Types', icon: Tag },
  { to: '/admin/data/units-of-measure', label: 'Units of Measure', icon: Ruler },
]

const dataManagementItems = [
  { to: '/admin/data/categories', label: 'Categories', icon: Tag },
  { to: '/admin/data/product-types', label: 'Product Types', icon: Layers },
  { to: '/admin/data/reference', label: 'Reference Data', icon: BookOpen },
]

const adminSettingsItems = [
  { to: '/admin/settings/form-change-review', label: 'Form Change Review', icon: AlertCircle },
  { to: '/admin/settings/forms', label: 'Forms', icon: ClipboardList },
  { to: '/admin/settings/implementation-types', label: 'Implementation Types', icon: Workflow },
  { to: '/admin/settings/import-templates', label: 'Import Templates', icon: FileSpreadsheet },
  { to: '/admin/settings/programs', label: 'Programs', icon: LayoutGrid },
]

const bottomNavItems = [
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/audit', label: 'Audit Log', icon: ScrollText, end: false },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U'

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold shrink-0">
                I
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-semibold text-sm">Imp Wizard</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role ?? 'Admin'}</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Top items: Dashboard, Projects */}
                  {topNavItems.map(item => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            `flex items-center gap-2${isActive ? ' bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''}`
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {/* Journeys — collapsible group */}
                  <Collapsible defaultOpen className="group/collapsible-journeys">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <Map className="h-4 w-4" />
                          <span>Journey Management</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible-journeys:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {journeyItems.map(item => (
                            <SidebarMenuSubItem key={item.to}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={item.to}
                                  end={item.to === '/admin/journeys'}
                                  className={({ isActive }) =>
                                    `flex items-center gap-2${isActive ? ' bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''}`
                                  }
                                >
                                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{item.label}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Catalogs — collapsible group */}
                  <Collapsible defaultOpen className="group/collapsible-catalogs">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <ShoppingBasket className="h-4 w-4" />
                          <span>Catalogs</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible-catalogs:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {catalogItems.map(item => (
                            <SidebarMenuSubItem key={item.to}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={item.to}
                                  className={({ isActive }) =>
                                    `flex items-center gap-2${isActive ? ' bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''}`
                                  }
                                >
                                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{item.label}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Data Management — collapsible group */}
                  <Collapsible defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <Database className="h-4 w-4" />
                          <span>Data Management</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {dataManagementItems.map(item => (
                            <SidebarMenuSubItem key={item.to}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={item.to}
                                  className={({ isActive }) =>
                                    `flex items-center gap-2${isActive ? ' bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''}`
                                  }
                                >
                                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{item.label}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Admin Settings — collapsible group */}
                  <Collapsible defaultOpen className="group/collapsible2">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <Settings className="h-4 w-4" />
                          <span>Admin Settings</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible2:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {adminSettingsItems.map(item => (
                            <SidebarMenuSubItem key={item.to}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={item.to}
                                  className={({ isActive }) =>
                                    `flex items-center gap-2${isActive ? ' bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''}`
                                  }
                                >
                                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{item.label}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Bottom items: Users, Audit Log */}
                  {bottomNavItems.map(item => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            `flex items-center gap-2${isActive ? ' bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''}`
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {/* Project Plan — external static link */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a href="/PROJECT-PLAN.html" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span>Project Plan</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="h-auto py-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start leading-none min-w-0">
                        <span className="text-sm font-medium truncate">{user?.name}</span>
                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                      </div>
                      <ChevronUp className="ml-auto h-4 w-4 shrink-0" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                      <User className="h-4 w-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-12 items-center gap-2 border-b px-4 shrink-0">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
